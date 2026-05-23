// src/app/api/auth/mfa/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasTokenVersionColumn } from '@/shared/lib/db-metadata';
import { MFAService } from '@/shared/lib/mfa';
import { signAuthJWT, type Role } from '@/shared/lib/jwt';
import { generateRefreshToken } from '@/lib/auth/token-service';
import { mfaRateLimit } from '@/shared/lib/rate-limit';
import { mfaVerificationSchema } from '@/shared/lib/validation';
import { SecurityService } from '@/shared/lib/security';
import { withErrorHandler } from '@/lib/api/error-handler';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

import { logger } from '@/lib/api/logger';

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Verificar se deve fazer redirect server-side (vindo de form submit)
  const shouldRedirect = req.nextUrl.searchParams.get('redirect') === 'true';

  // Suportar tanto JSON quanto FormData
  const contentType = req.headers.get('content-type') || '';
  let raw: {
    userId?: unknown;
    code?: unknown;
    tipoAcao?: unknown;
    challenge?: unknown;
    rememberDevice?: unknown;
  } = {};

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await req.formData();
    raw = {
      userId: parseInt(formData.get('userId') as string, 10),
      code: formData.get('code') as string,
      tipoAcao: formData.get('tipoAcao') as string,
      challenge: (formData.get('challenge') as string) || undefined,
    };
  } else {
    raw = await req.json().catch(() => ({}));
  }

  const parsed = mfaVerificationSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'ID do usuário e código são obrigatórios', success: false },
      { status: 400 },
    );
  }
  const { userId, code, tipoAcao = 'LOGIN', challenge, rememberDevice } = parsed.data;
  const tipoAcaoMapped: 'LOGIN' | 'RESET' | 'PRIMEIRO_ACESSO' | 'DESBLOQUEIO' =
    tipoAcao === 'RESET_PASSWORD' ? 'RESET' : (tipoAcao as 'LOGIN' | 'PRIMEIRO_ACESSO');

  // Detectar se é backup code (10 chars alfanumérico, com ou sem hífen)
  const cleanCode = code.replace(/-/g, '').toUpperCase();
  const isBackupCode = /^[A-Z0-9]{10}$/.test(cleanCode);

  // Verificar MFA challenge para fluxos de LOGIN e PRIMEIRO_ACESSO (proteção anti-bypass)
  if (tipoAcao === 'LOGIN' || tipoAcao === 'PRIMEIRO_ACESSO') {
    if (!challenge) {
      return NextResponse.json(
        { error: 'Sessão inválida. Faça login novamente.', success: false },
        { status: 400 },
      );
    }
    const { verifyMfaChallenge } = await import('@/shared/lib/mfa-challenge');
    const isValid = verifyMfaChallenge(challenge, {
      userId,
      tipoAcao: tipoAcaoMapped as 'LOGIN' | 'PRIMEIRO_ACESSO',
    });
    if (!isValid) {
      return NextResponse.json(
        { error: 'Sessão expirada. Faça login novamente.', success: false },
        { status: 401 },
      );
    }
  }

  const recentMfaFailureRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM TentativaLogin
      WHERE usuarioId = ${userId}
        AND sucesso = FALSE
        AND motivo = 'MFA_INVALID'
        AND criadaEm > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `;
  const recentMfaFailures = Number(recentMfaFailureRows[0]?.count ?? 0);
  if (recentMfaFailures >= 3) {
    return NextResponse.json(
      {
        error: 'Muitas tentativas de MFA. Aguarde 5 minutos.',
        success: false,
        retryAfter: 300,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '300',
        },
      },
    );
  }

  // Aplicar rate limiting por userId antes de consultar o usuário completo.
  const rateLimitResult = await mfaRateLimit.checkLimit(req, `mfa:user:${userId}`);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: rateLimitResult.message,
        success: false,
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  // Verificar código MFA ou backup code
  let mfaValid = false;
  if (isBackupCode) {
    // Backup code path — verificar bcrypt contra os hashes armazenados
    type BackupRow = { id: number; codeHash: string };
    const backupRows = await prisma.$queryRaw<BackupRow[]>`
        SELECT id, codeHash FROM MfaBackupCode
        WHERE usuarioId = ${userId} AND usadoEm IS NULL
        ORDER BY criadoEm ASC
        LIMIT 20
      `;
    for (const row of backupRows) {
      if (await bcrypt.compare(cleanCode, row.codeHash)) {
        await prisma.$executeRaw`
            UPDATE MfaBackupCode SET usadoEm = NOW() WHERE id = ${row.id}
          `;
        mfaValid = true;
        break;
      }
    }
  } else {
    // TOTP/email code path
    const mfaResult = await MFAService.verifyMFACode({
      usuarioId: userId,
      code,
      tipoAcao: tipoAcaoMapped,
    });
    mfaValid = mfaResult.valid;
    if (!mfaValid) {
      await prisma.$executeRaw`
          INSERT INTO TentativaLogin (usuarioId, email, sucesso, ip, userAgent, motivo)
          SELECT id, email, FALSE, ${getClientIP(req)}, ${req.headers.get('user-agent') || undefined}, 'MFA_INVALID'
          FROM Usuario
          WHERE id = ${userId}
        `;

      const updatedMfaFailureRows = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*) as count
          FROM TentativaLogin
          WHERE usuarioId = ${userId}
            AND sucesso = FALSE
            AND motivo = 'MFA_INVALID'
            AND criadaEm > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        `;
      const updatedMfaFailures = Number(updatedMfaFailureRows[0]?.count ?? 0);
      if (updatedMfaFailures >= 3) {
        return NextResponse.json(
          {
            error: 'Muitas tentativas de MFA. Aguarde 5 minutos.',
            success: false,
            retryAfter: 300,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '3',
              'X-RateLimit-Remaining': '0',
              'Retry-After': '300',
            },
          },
        );
      }
      return NextResponse.json(
        { error: mfaResult.error || 'Código inválido', success: false },
        { status: 401 },
      );
    }
  }

  if (!mfaValid) {
    await prisma.$executeRaw`
        INSERT INTO TentativaLogin (usuarioId, email, sucesso, ip, userAgent, motivo)
        SELECT id, email, FALSE, ${getClientIP(req)}, ${req.headers.get('user-agent') || undefined}, 'MFA_INVALID'
        FROM Usuario WHERE id = ${userId}
      `;
    return NextResponse.json(
      { error: 'Código de backup inválido ou já utilizado', success: false },
      { status: 401 },
    );
  }

  // Buscar dados completos do usuário apenas após passar no rate limit e no MFA.
  // hasTokenVersionColumn() tem cache permanente — column sempre existe após o deploy atual.
  const hasTokenVersion = await hasTokenVersionColumn();
  const fullUserRows = hasTokenVersion
    ? await prisma.$queryRaw<
        Array<{
          id: number;
          email: string;
          nomeCompleto: string | null;
          primeiroAcesso: boolean;
          senhaProvisoria: boolean;
          tipo: string | null;
          tokenVersion: number;
        }>
      >`
          SELECT id, email, nomeCompleto, primeiroAcesso, senhaProvisoria, nivel as tipo, tokenVersion
          FROM Usuario
          WHERE id = ${userId}
          LIMIT 1
        `
    : (
        await prisma.$queryRaw<
          Array<{
            id: number;
            email: string;
            nomeCompleto: string | null;
            primeiroAcesso: boolean;
            senhaProvisoria: boolean;
            tipo: string | null;
          }>
        >`
          SELECT id, email, nomeCompleto, primeiroAcesso, senhaProvisoria, nivel as tipo
          FROM Usuario
          WHERE id = ${userId}
          LIMIT 1
        `
      ).map((r) => ({ ...r, tokenVersion: 0 }));

  const user = fullUserRows[0];
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado', success: false }, { status: 404 });
  }

  // Definir IP e UA para logs e token service
  const reqIp = getClientIP(req);
  const reqUA = req.headers.get('user-agent') || undefined;

  const refreshResultPromise = (async () => {
    try {
      return await generateRefreshToken(user.id, user.email, user.tipo || 'USUARIO', {
        ip: reqIp,
        userAgent: reqUA,
      });
    } catch (e) {
      logger.warn('[MFA] Failed to generate refresh token', { error: e });
      return undefined;
    }
  })();

  const clearFailedAttemptsPromise = (async () => {
    try {
      const { BlockingService } = await import('@/shared/lib/blocking');
      await BlockingService.clearFailedAttempts(user.id);
    } catch (e) {
      logger.warn('[MFA] Falha ao desbloquear usuário após sucesso', { error: e });
    }
  })();

  const sessionTokenPromise = user.primeiroAcesso
    ? Promise.resolve(undefined)
    : (async () => {
        try {
          return await SecurityService.createSession(user.id, reqIp, reqUA);
        } catch (e) {
          logger.warn('[MFA] Falha ao criar sessão ativa', { error: e });
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
        tokenVersion: user.tokenVersion,
      },
      '8h',
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
    prisma.$executeRaw`
        DELETE FROM TentativaLogin
        WHERE usuarioId = ${user.id}
          AND motivo = 'MFA_INVALID'
      `,
    clearFailedAttemptsPromise,
  ]);

  const refreshToken = refreshResult?.refreshToken;

  // Se é primeiro acesso, redirecionar para configuração
  if (user.primeiroAcesso) {
    const response = NextResponse.json({
      success: true,
      requiresSetup: true,
      nextStep: 'primeiro-acesso',
      redirectUrl: `/primeiro-acesso?userId=${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        nomeCompleto: user.nomeCompleto,
        primeiroAcesso: user.primeiroAcesso,
      },
    });

    // Set httpOnly cookie para autenticação temporária
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    // Set Refresh Token
    if (refreshToken) {
      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/api/auth',
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
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

      response.cookies.getAll().forEach((cookie) => {
        htmlResponse.cookies.set(cookie.name, cookie.value, {
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as 'lax' | 'strict' | 'none',
          maxAge: cookie.maxAge,
          path: '/',
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
      tipo: user.tipo,
    },
  });

  // Set httpOnly cookie (JWT)
  response.cookies.set('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });

  // Set Refresh Token
  if (refreshToken) {
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/api/auth',
    });
  }

  if (sessionToken) {
    response.cookies.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
    });
  }

  // Lembrar dispositivo por 30 dias (fire-and-forget)
  if (rememberDevice && !user.primeiroAcesso) {
    const deviceToken = randomUUID().replace(/-/g, '');
    const ip = getClientIP(req);
    const ua = req.headers.get('user-agent') || null;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    prisma.$executeRaw`
        INSERT INTO DispositivoConfiavel (empresaId, usuarioId, deviceToken, userAgent, ip, nome, expiresAt)
        VALUES (1, ${user.id}, ${deviceToken}, ${ua}, ${ip}, ${ua ? ua.slice(0, 50) : null}, ${expiresAt})
      `.catch((e) => logger.warn('[MFA] Falha ao salvar dispositivo confiável', { error: e }));
    response.cookies.set('deviceTrust', deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
  }

  // Alerta de novo dispositivo (fire-and-forget)
  (async () => {
    try {
      const { checkAndAlertNewDevice } = await import('@/shared/lib/auth/device-alert');
      await checkAndAlertNewDevice({
        userId: user.id,
        ip: getClientIP(req),
        userAgent: req.headers.get('user-agent') || '',
        email: user.email,
        name: user.nomeCompleto || user.email,
      });
    } catch (e) {
      logger.warn('[MFA] Falha ao verificar alerta de novo dispositivo', { error: e });
    }
  })();
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
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

    // Copiar todos os cookies para a resposta HTML
    response.cookies.getAll().forEach((cookie) => {
      htmlResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as 'lax' | 'strict' | 'none',
        maxAge: cookie.maxAge,
        path: '/',
      });
    });

    return htmlResponse;
  }

  return response;
});
