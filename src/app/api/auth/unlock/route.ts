// src/app/api/auth/unlock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BlockingService } from '@/shared/lib/blocking';
import { AuditLogger } from '@/shared/lib/audit';
import { unlockSchema } from '@/shared/lib/validation';
import { withErrorHandler } from '@/lib/api/error-handler';
import { RateLimiter } from '@/shared/lib/rate-limit';

// Rate limit para desbloqueio — 3 tentativas por 15 minutos
// PIN de 4 dígitos = 10.000 combinações, sem rate limit seria brute-forceável em minutos
const unlockRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3,
  message: 'Muitas tentativas de desbloqueio. Aguarde 15 minutos.',
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting
  const rl = await unlockRateLimit.isAllowed(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message, success: false }, { status: 429 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = unlockSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos para desbloqueio', success: false },
      { status: 400 },
    );
  }
  const { method } = parsed.data as { method: 'pin' | 'security' };
  const normalizedEmail = ('email' in parsed.data ? parsed.data.email : '').toLowerCase().trim();

  // Resolver usuário internamente por email para evitar depender de IDs expostos no cliente.
  const userRows = await prisma.$queryRaw<
    Array<{
      id: number;
      email: string;
      nomeCompleto: string;
      bloqueado: boolean;
    }>
  >`
      SELECT id, email, nomeCompleto, bloqueado
      FROM Usuario 
      WHERE email = ${normalizedEmail}
      LIMIT 1
    `;

  const user = userRows[0];

  if (!user || !user.bloqueado) {
    return NextResponse.json(
      { error: 'Não foi possível desbloquear a conta com os dados informados', success: false },
      { status: 401 },
    );
  }

  const userId = user.id;
  let unlockResult: { success: boolean; error?: string };

  // Tentar desbloqueio com método escolhido
  if (method === 'pin') {
    const { pin } = parsed.data as { method: 'pin'; email: string; pin: string };
    unlockResult = await BlockingService.unlockWithPin(userId, pin);
  } else {
    const { answer } = parsed.data as { method: 'security'; email: string; answer: string };
    unlockResult = await BlockingService.unlockWithSecurityQuestion(userId, answer);
  }

  if (!unlockResult.success) {
    // Log tentativa de desbloqueio falhada
    await AuditLogger.logLogin(userId, user.email, req, false, {
      action: 'unlock_attempt',
      method,
      reason: unlockResult.error,
    });

    return NextResponse.json(
      { error: 'Não foi possível desbloquear a conta com os dados informados', success: false },
      { status: 401 },
    );
  }

  // Log desbloqueio bem-sucedido
  await AuditLogger.logLogin(userId, user.email, req, true, {
    action: 'unlock_success',
    method,
    unlockedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: 'Conta desbloqueada com sucesso',
  });
});
