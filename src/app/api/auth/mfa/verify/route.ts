// src/app/api/auth/mfa/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasTokenVersionColumn } from "@/shared/lib/db-metadata";
import { MFAService } from "@/shared/lib/mfa";
import { signAuthJWT, type Role } from "@/shared/lib/jwt";
import { generateRefreshToken } from "@/lib/auth/token-service";
import { mfaRateLimit } from "@/shared/lib/rate-limit";
import { mfaVerificationSchema } from "@/shared/lib/validation";
import { SecurityService } from "@/shared/lib/security";
import { withErrorHandler } from '@/lib/api/error-handler';

import { logger } from "@/lib/api/logger";

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export const POST = withErrorHandler(async (req: NextRequest) => {
    // Verificar se deve fazer redirect server-side (vindo de form submit)
    const shouldRedirect = req.nextUrl.searchParams.get('redirect') === 'true'
    
    // Suportar tanto JSON quanto FormData
    const contentType = req.headers.get('content-type') || ''
    let raw: { userId?: unknown; code?: unknown; tipoAcao?: unknown } = {}
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      raw = {
        userId: parseInt(formData.get('userId') as string, 10),
        code: formData.get('code') as string,
        tipoAcao: formData.get('tipoAcao') as string
      }
    } else {
      raw = await req.json().catch(() => ({}))
    }
    
    const parsed = mfaVerificationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ID do usuário e código são obrigatórios", success: false },
        { status: 400 }
      );
    }
    const { userId, code, tipoAcao = "LOGIN" } = parsed.data;
    const tipoAcaoMapped: "LOGIN" | "RESET" | "PRIMEIRO_ACESSO" | "DESBLOQUEIO" =
      tipoAcao === "RESET_PASSWORD" ? "RESET" : (tipoAcao as "LOGIN" | "PRIMEIRO_ACESSO");

    // Aplicar rate limiting por userId antes de consultar o usuário completo.
    const rateLimitResult = await mfaRateLimit.checkLimit(req, `mfa:user:${userId}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitResult.message,
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Verificar código MFA
    const mfaResult = await MFAService.verifyMFACode({
      usuarioId: userId,
      code,
      tipoAcao: tipoAcaoMapped
    });

    if (!mfaResult.valid) {
      return NextResponse.json(
        { error: mfaResult.error || "Código inválido", success: false },
        { status: 401 }
      );
    }

    // Buscar dados completos do usuário apenas após passar no rate limit e no MFA.
    // hasTokenVersionColumn() tem cache permanente — column sempre existe após o deploy atual.
    const hasTokenVersion = await hasTokenVersionColumn();
    const fullUserRows = hasTokenVersion
      ? await prisma.$queryRaw<Array<{
          id: number;
          email: string;
          nomeCompleto: string | null;
          primeiroAcesso: boolean;
          senhaProvisoria: boolean;
          tipo: string | null;
          tokenVersion: number;
        }>>`
          SELECT id, email, nomeCompleto, primeiroAcesso, senhaProvisoria, nivel as tipo, tokenVersion
          FROM Usuario
          WHERE id = ${userId}
          LIMIT 1
        `
      : (await prisma.$queryRaw<Array<{
          id: number;
          email: string;
          nomeCompleto: string | null;
          primeiroAcesso: boolean;
          senhaProvisoria: boolean;
          tipo: string | null;
        }>>`
          SELECT id, email, nomeCompleto, primeiroAcesso, senhaProvisoria, nivel as tipo
          FROM Usuario
          WHERE id = ${userId}
          LIMIT 1
        `).map((r) => ({ ...r, tokenVersion: 0 }));

    const user = fullUserRows[0];
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado", success: false },
        { status: 404 }
      );
    }

    // Definir IP e UA para logs e token service
    const reqIp = getClientIP(req);
    const reqUA = req.headers.get("user-agent") || undefined;

    const refreshResultPromise = (async () => {
      try {
        return await generateRefreshToken(
          user.id,
          user.email,
          user.tipo || 'USUARIO',
          { ip: reqIp, userAgent: reqUA }
        );
      } catch (e) {
        logger.warn('[MFA] Failed to generate refresh token', { error: e });
        return undefined;
      }
    })();

    const clearFailedAttemptsPromise = (async () => {
      try {
        const { BlockingService } = await import("@/shared/lib/blocking");
        await BlockingService.clearFailedAttempts(user.id);
      } catch (e) {
        logger.warn("[MFA] Falha ao desbloquear usuário após sucesso", { error: e });
      }
    })();

    const sessionTokenPromise = user.primeiroAcesso
      ? Promise.resolve(undefined)
      : (async () => {
          try {
            return await SecurityService.createSession(user.id, reqIp, reqUA);
          } catch (e) {
            logger.warn("[MFA] Falha ao criar sessão ativa", { error: e });
            return undefined;
          }
        })();

    const [token, refreshResult, sessionToken] = await Promise.all([
      signAuthJWT(
        {
          sub: String(user.id),
          role: (user.tipo || 'USUARIO') as Role,
          email: user.email,
          status: 'ATIVO',
          tokenVersion: user.tokenVersion
        },
        '8h'
      ),
      refreshResultPromise,
      sessionTokenPromise,
      prisma.$executeRaw`
        INSERT INTO TentativaLogin (usuarioId, email, sucesso, ip, userAgent)
        VALUES (${user.id}, ${user.email}, TRUE, ${reqIp}, ${reqUA})
      `,
      prisma.$executeRaw`
        UPDATE Usuario 
        SET ultimoLoginEm = NOW() 
        WHERE id = ${user.id}
      `,
      clearFailedAttemptsPromise
    ]);

    let refreshToken: string | undefined;
    refreshToken = refreshResult?.refreshToken;

    // Se é primeiro acesso, redirecionar para configuração
    if (user.primeiroAcesso) {
      const response = NextResponse.json({
        success: true,
        requiresSetup: true,
        nextStep: "primeiro-acesso",
        redirectUrl: `/primeiro-acesso?userId=${user.id}`,
        user: {
          id: user.id,
          email: user.email,
          nomeCompleto: user.nomeCompleto,
          primeiroAcesso: user.primeiroAcesso
        }
      });

      // Set httpOnly cookie para autenticação temporária
      response.cookies.set("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60, // 8 hours
        path: '/'
      });
      
      // Set Refresh Token
      if (refreshToken) {
        response.cookies.set("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/api/auth'
        });
      }

      // Se veio de form submit, retornar HTML com redirect para primeiro acesso
      if (shouldRedirect) {
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecionando...</title>
</head>
<body>
  <p>Autenticação bem-sucedida! Redirecionando para configuração inicial...</p>
  <script>
    setTimeout(function() {
      window.location.href = '/primeiro-acesso?userId=${user.id}';
    }, 100);
  </script>
</body>
</html>`;
        
        const htmlResponse = new NextResponse(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
        
        response.cookies.getAll().forEach(cookie => {
          htmlResponse.cookies.set(cookie.name, cookie.value, {
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite as 'lax' | 'strict' | 'none',
            maxAge: cookie.maxAge,
            path: '/'
          });
        });
        
        return htmlResponse;
      }

      return response;
    }

    // Login normal completo
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nomeCompleto: user.nomeCompleto,
        tipo: user.tipo
      }
    });

  // Set httpOnly cookie (JWT)
    response.cookies.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/'
    });
    
    // Set Refresh Token
    if (refreshToken) {
      response.cookies.set("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/api/auth'
      });
    }

    if (sessionToken) {
      response.cookies.set("sessionToken", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60
      });
    }

    // Se veio de form submit, retornar HTML com redirect client-side
    // Isso garante que os cookies sejam salvos antes do redirect
    if (shouldRedirect) {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecionando...</title>
</head>
<body>
  <p>Autenticação bem-sucedida! Redirecionando...</p>
  <script>
    // Aguardar um momento para cookies serem salvos, então redirecionar
    setTimeout(function() {
      window.location.href = '/dashboard';
    }, 100);
  </script>
</body>
</html>`;
      
      const htmlResponse = new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
      
      // Copiar todos os cookies para a resposta HTML
      response.cookies.getAll().forEach(cookie => {
        htmlResponse.cookies.set(cookie.name, cookie.value, {
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as 'lax' | 'strict' | 'none',
          maxAge: cookie.maxAge,
          path: '/'
        });
      });
      
      return htmlResponse;
    }

    return response;

  });
