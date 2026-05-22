// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/shared/lib/password";
import { MFAService } from "@/shared/lib/mfa";
import { BlockingService } from "@/shared/lib/blocking";
import { loginRateLimit } from "@/shared/lib/rate-limit";
import { AuditLogger } from "@/shared/lib/audit";
import { loginSchema } from "@/shared/lib/validation";
import { withErrorHandler } from '@/lib/api/error-handler';

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0] || 
         req.headers.get("x-real-ip") || 
         req.headers.get("cf-connecting-ip") || 
         "unknown";
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  // Parse body first so we can use the email as a per-user rate-limit key
  const body = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email e senha são obrigatórios", success: false },
      { status: 400 }
    );
  }
  const { email, password } = parsed.data;

  // Per-email rate limiting — prevents tests / different users from sharing one bucket
  const rateLimitKey = `login:${email}`;
  const rateLimitResult = await loginRateLimit.isAllowed(req, rateLimitKey);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: rateLimitResult.message,
        success: false,
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  // Buscar usuário
  const rows: Array<{
    id: number;
    email: string;
    nomeCompleto: string;
    senha: string;
    senhaProvisoria: boolean;
    primeiroAcesso: boolean;
    criadoEm: Date;
    status: string;
    nivel: string | null;
    tokenVersion: number | null;
    expiresAt: Date | null;
  }> = await prisma.$queryRaw`
    SELECT id, email, nomeCompleto, senha, senhaProvisoria, primeiroAcesso, criadoEm, status, nivel, tokenVersion, expiresAt
    FROM Usuario 
    WHERE email = ${email}
    LIMIT 1
  `;

  const user = rows[0];

  // Verificar se usuário existe
  if (!user) {
    await BlockingService.recordFailedAttempt({ email, ip, userAgent, motivo: 'INVALID_EMAIL' });
    return NextResponse.json(
      { error: "Credenciais inválidas", success: false }, 
      { status: 401 }
    );
  }

  // Verificar status do usuário — 403 Forbidden (conta desativada pelo admin, não erro de credenciais)
  if (user.status !== "ATIVO") {
    return NextResponse.json(
      { error: "Conta inativa. Entre em contato com o administrador.", success: false }, 
      { status: 403 }
    );
  }

  // Verificar expiração de conta — inativa automaticamente e bloqueia acesso
  if (user.expiresAt && user.expiresAt < new Date()) {
    await prisma.$executeRaw`
      UPDATE Usuario SET status = 'INATIVO', atualizadoEm = NOW() WHERE id = ${user.id}
    `;
    return NextResponse.json(
      { error: "Acesso expirado. Esta conta foi desativada automaticamente. Entre em contato com o administrador.", success: false },
      { status: 403 }
    );
  }

  // Verificar se usuário está bloqueado
  const blockInfo = await BlockingService.checkUserBlock(user.id);
  if (blockInfo.blocked) {
    let errorMsg = "Conta temporariamente bloqueada devido a múltiplas tentativas incorretas.";
    
    if (blockInfo.unlockAt) {
      const minutesLeft = Math.ceil((blockInfo.unlockAt.getTime() - Date.now()) / (1000 * 60));
      errorMsg += ` Tente novamente em ${minutesLeft} minuto(s).`;
    } else {
      errorMsg += " Entre em contato com o administrador.";
    }

    return NextResponse.json(
      { 
        error: errorMsg,
        success: false,
        blocked: true,
        unlockAt: blockInfo.unlockAt,
        requiresPinUnlock: blockInfo.requiresPinUnlock,
        requiresSecurityQuestion: blockInfo.requiresSecurityQuestion
      }, 
      { status: 423 } // 423 Locked
    );
  }

  // Verificar senha
  const isValidPassword = await PasswordService.verifyPassword(password, user.senha);
  if (!isValidPassword) {
    await BlockingService.recordFailedAttempt({
      userId: user.id,
      email,
      ip,
      userAgent,
      motivo: 'INVALID_PASSWORD'
    });

    await AuditLogger.logLogin(user.id, user.email, req, false, {
      reason: 'invalid_password'
    });

    const failedAttemptRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM TentativaLogin
      WHERE usuarioId = ${user.id}
        AND sucesso = FALSE
        AND criadaEm > COALESCE(
          (SELECT MAX(criadaEm) FROM TentativaLogin WHERE usuarioId = ${user.id} AND sucesso = TRUE),
          DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
        AND criadaEm > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;
    const failedAttempts = Number(failedAttemptRows[0]?.count ?? 0);

    if (failedAttempts >= 5) {
      await prisma.$executeRaw`
        UPDATE Usuario
        SET bloqueado = TRUE, bloqueadoEm = NOW()
        WHERE id = ${user.id}
      `;

      const updatedBlockInfo = await BlockingService.checkUserBlock(user.id);
      let errorMsg = "Conta temporariamente bloqueada devido a múltiplas tentativas incorretas.";

      if (updatedBlockInfo.unlockAt) {
        const minutesLeft = Math.ceil((updatedBlockInfo.unlockAt.getTime() - Date.now()) / (1000 * 60));
        errorMsg += ` Tente novamente em ${minutesLeft} minuto(s).`;
      } else {
        errorMsg += " Entre em contato com o administrador.";
      }

      return NextResponse.json(
        {
          error: errorMsg,
          success: false,
          blocked: true,
          unlockAt: updatedBlockInfo.unlockAt,
          requiresPinUnlock: updatedBlockInfo.requiresPinUnlock,
          requiresSecurityQuestion: updatedBlockInfo.requiresSecurityQuestion
        },
        { status: 423 }
      );
    }

    return NextResponse.json(
      { error: "Credenciais inválidas", success: false }, 
      { status: 401 }
    );
  }

  // Senha válida - aguardar verificação de MFA para concluir login

  // Determinar tipo de acesso
  let accessType: "PRIMEIRO_ACESSO" | "LOGIN" = "LOGIN";
  let nextStep = "mfa";

  if (user.primeiroAcesso) {
    accessType = "PRIMEIRO_ACESSO";
    nextStep = "primeiro-acesso";
    
    // Verificar se senha é provisória e expirou
    if (user.senhaProvisoria && user.criadoEm < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      return NextResponse.json({
        error: "Senha provisória expirada",
        success: false,
        requiresPasswordReset: true
      }, { status: 410 }); // 410 Gone
    }
  }

  // Verificar se MFA deve ser desabilitado para testes
  const disableMFA = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.E2E_MODE === '1') && process.env.DISABLE_MFA_FOR_TESTS === 'true';

  if (disableMFA) {
    const userRole = ((user.nivel ?? "USUARIO").toUpperCase() as "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE");
    const userStatus = ((user.status ?? "ATIVO") as "ATIVO" | "INATIVO");

    // Usar signAuthJWT (jose) para E2E/desenvolvimento
    const { signAuthJWT } = await import("@/shared/lib/jwt");
    const token = await signAuthJWT({
      sub: user.id.toString(),
      role: userRole,
      email: user.email,
      status: userStatus,
      tokenVersion: user.tokenVersion ?? 0
    }, '8h');

    // Log de auditoria para login bem-sucedido
    await AuditLogger.logLogin(user.id, user.email, req, true, {
      method: 'password',
      mfaSkipped: true
    });

    // Criar resposta com cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nomeCompleto: user.nomeCompleto,
        primeiroAcesso: user.primeiroAcesso
      }
    }, { status: 200 });

    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 horas
      path: '/'
    });

    return response;
  }

  // Verificar dispositivo confiável (cookie deviceTrust) — pula MFA se válido
  const deviceTrustCookie = req.cookies.get("deviceTrust")?.value;
  if (deviceTrustCookie && !user.primeiroAcesso) {
    type TrustRow = { id: number };
    const trusted = await prisma.$queryRaw<TrustRow[]>`
      SELECT id FROM DispositivoConfiavel
      WHERE usuarioId = ${user.id} AND deviceToken = ${deviceTrustCookie} AND expiresAt > NOW()
      LIMIT 1
    `.catch(() => [] as TrustRow[]);
    if (trusted.length > 0) {
      // Dispositivo confiável — emitir token direto sem MFA
      const { signAuthJWT } = await import("@/shared/lib/jwt");
      const { generateRefreshToken } = await import("@/lib/auth/token-service");
      const { SecurityService } = await import("@/shared/lib/security");
      const userRole = ((user.nivel ?? "USUARIO").toUpperCase() as "ADMIN" | "GERENTE" | "USUARIO" | "FINANCEIRO" | "ESTOQUE" | "CLIENTE");
      const userStatus = ((user.status ?? "ATIVO") as "ATIVO" | "INATIVO");
      const [token, refreshResult, sessionToken] = await Promise.all([
        signAuthJWT({ sub: user.id.toString(), role: userRole, email: user.email, status: userStatus, tokenVersion: user.tokenVersion ?? 0 }, '8h'),
        generateRefreshToken(user.id, user.email, userRole, { ip, userAgent }).catch(() => undefined),
        SecurityService.createSession(user.id, ip, userAgent).catch(() => undefined),
      ]);
      await Promise.all([
        prisma.$executeRaw`INSERT INTO TentativaLogin (usuarioId, email, sucesso, ip, userAgent) VALUES (${user.id}, ${user.email}, TRUE, ${ip}, ${userAgent})`,
        prisma.$executeRaw`UPDATE Usuario SET ultimoLoginEm = NOW() WHERE id = ${user.id}`,
        AuditLogger.logLogin(user.id, user.email, req, true, { method: 'trusted-device' }),
      ]).catch(() => {});
      const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, nomeCompleto: user.nomeCompleto } });
      response.cookies.set('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60, path: '/' });
      if (refreshResult?.refreshToken) response.cookies.set('refreshToken', refreshResult.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/api/auth' });
      if (sessionToken) response.cookies.set('sessionToken', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24 * 60 * 60 });
      return response;
    }
  }

  // Pré-aquecer SMTP em background para reduzir latência do primeiro envio
  const { EmailService } = await import("@/shared/lib/email");
  EmailService.prewarm();

  // Gerar código MFA
  const { code: mfaCode } = await MFAService.createMFACode({
    usuarioId: user.id,
    tipoAcao: accessType,
    ip,
    userAgent
  });

  // Enviar código MFA por email (fire-and-forget para não bloquear resposta)
  EmailService.sendMFA({
    to: user.email,
    userName: user.nomeCompleto,
    code: mfaCode,
    expiresInMinutes: 5,
    isFirstAccess: user.primeiroAcesso
  }).catch(() => {
    // Email failure is logged internally by EmailService
  });

  const { createMfaChallenge } = await import("@/shared/lib/mfa-challenge");

  // NUNCA enviar código MFA no response
  return NextResponse.json({
    success: true,
    mfaRequired: true,
    nextStep,
    emailSent: true,
    mfaChallenge: createMfaChallenge({
      userId: user.id,
      tipoAcao: accessType,
    }),
    user: {
      id: user.id,
      email: user.email,
      nomeCompleto: user.nomeCompleto,
      primeiroAcesso: user.primeiroAcesso
    }
  }, { status: 200 });

});
