// src/app/api/auth/first-access/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PasswordService } from '@/shared/lib/password';
import { firstAccessSetupApiSchema } from '@/shared/lib/validation';
import { withErrorHandler } from '@/lib/api/error-handler';
import { AuditLogger } from '@/shared/lib/audit';
import { RateLimiter } from '@/shared/lib/rate-limit';
import { logger } from '@/lib/api/logger';
import { verifyAuthJWT } from '@/shared/lib/jwt';

// Rate limit — 5 tentativas / 15 min
const firstAccessRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas. Aguarde 15 minutos.',
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting
  const rl = await firstAccessRateLimit.isAllowed(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message, success: false }, { status: 429 });
  }

  // [SEC] Verificar que o chamador tem o JWT emitido pelo MFA para este userId.
  // Sem isso, qualquer um que conhece o userId poderia definir a senha de outro usuário.
  const authToken = req.cookies.get('authToken')?.value;
  if (!authToken) {
    return NextResponse.json(
      { error: 'Sessão inválida. Faça login novamente.', success: false },
      { status: 401 },
    );
  }

  let jwtUserId: number;
  try {
    const claims = await verifyAuthJWT(authToken);
    jwtUserId = Number(claims.sub);
    if (!jwtUserId || Number.isNaN(jwtUserId)) throw new Error('sub inválido');
  } catch {
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.', success: false },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = firstAccessSetupApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos para configuração de primeiro acesso', success: false },
      { status: 400 },
    );
  }
  const { userId, newPassword, pin, securityQuestion, securityAnswer } = parsed.data;

  // [SEC] Garantir que o userId do body corresponde ao sub do JWT (anti account-takeover).
  // O JWT foi emitido pelo mfa/verify — se os IDs divergem, rejeitar.
  if (userId !== jwtUserId) {
    logger.warn('[FirstAccess] userId do body difere do JWT — possível tentativa de takeover', {
      userId: jwtUserId,
    });
    return NextResponse.json(
      { error: 'Sessão inválida. Faça login novamente.', success: false },
      { status: 403 },
    );
  }

  // Validar senha
  const passwordValidation = PasswordService.validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return NextResponse.json(
      {
        error:
          'Senha não atende aos critérios de segurança: ' + passwordValidation.errors.join(', '),
        success: false,
      },
      { status: 400 },
    );
  }

  // Validar PIN
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: 'PIN deve conter exatamente 4 dígitos', success: false },
      { status: 400 },
    );
  }

  // Validar resposta de segurança
  if (securityAnswer.trim().length < 3) {
    return NextResponse.json(
      { error: 'Resposta de segurança deve ter pelo menos 3 caracteres', success: false },
      { status: 400 },
    );
  }

  // Buscar usuário para verificar se está em primeiro acesso
  const userRows = await prisma.$queryRaw<
    Array<{
      id: number;
      primeiroAcesso: boolean;
      email: string;
      nomeCompleto: string;
    }>
  >`
      SELECT id, primeiroAcesso, email, nomeCompleto
      FROM Usuario 
      WHERE id = ${userId}
      LIMIT 1
    `;

  const user = userRows[0];
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado', success: false }, { status: 404 });
  }

  if (!user.primeiroAcesso) {
    return NextResponse.json(
      { error: 'Usuário já completou o primeiro acesso', success: false },
      { status: 400 },
    );
  }

  // Hash da nova senha, PIN e resposta de segurança — tudo via PasswordService (cost unificado)
  const [hashedPassword, hashedPin, hashedAnswer] = await Promise.all([
    PasswordService.hashPassword(newPassword),
    PasswordService.hashPassword(pin),
    PasswordService.hashPassword(securityAnswer.toLowerCase().trim()),
  ]);

  // Atualizar usuário no banco
  await prisma.$executeRaw`
      UPDATE Usuario 
      SET 
        senha = ${hashedPassword},
        senhaProvisoria = FALSE,
        pinSeguranca = ${hashedPin},
        perguntaSecreta = ${securityQuestion},
        respostaSecreta = ${hashedAnswer},
        primeiroAcesso = FALSE,
        atualizadoEm = NOW()
      WHERE id = ${userId}
    `;

  // Operações pós-setup em paralelo (não bloqueantes)
  await Promise.all([
    // Registrar mudança de senha no histórico
    prisma.$executeRaw`
        INSERT INTO HistoricoSenha (usuarioId, senhaHash, criadaEm)
        VALUES (${userId}, ${hashedPassword}, NOW())
      `,
    // Limpar tentativas de login falhadas (fresh start)
    prisma.$executeRaw`
        DELETE FROM TentativaLogin 
        WHERE usuarioId = ${userId}
      `,
    // Invalidar códigos MFA antigos
    prisma.$executeRaw`
        UPDATE CodigoMFA 
        SET usado = TRUE 
        WHERE usuarioId = ${userId}
      `,
  ]);

  // Log de auditoria
  await AuditLogger.logFirstAccess(userId, user.email, req);

  // Enviar email de confirmação (não bloqueia se falhar)
  try {
    const { EmailService } = await import('@/shared/lib/email');
    await EmailService.sendFirstAccessConfirmation({
      to: user.email,
      userName: user.nomeCompleto,
    }).catch((err: unknown) => {
      logger.warn('[first-access] Falha ao enviar email de confirmação', { error: err });
    });
  } catch (emailError) {
    logger.warn('Erro ao enviar email de confirmação no first-access', { error: emailError });
    // Não falhar a operação por causa do email
  }

  return NextResponse.json({
    success: true,
    message: 'Configuração concluída com sucesso',
    user: {
      id: user.id,
      email: user.email,
      nomeCompleto: user.nomeCompleto,
      primeiroAcesso: false,
    },
  });
});
