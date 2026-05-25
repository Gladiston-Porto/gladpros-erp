// src/app/api/auth/user-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { userStatusSchema } from '@/shared/lib/validation';
import { withErrorHandler } from '@/lib/api/error-handler';
import { RateLimiter } from '@/shared/lib/rate-limit';

// Rate limit — 10 req/minuto por IP (previne enumeração em massa)
const userStatusRateLimit = new RateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Muitas solicitações. Aguarde um momento.',
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting
  const rl = await userStatusRateLimit.isAllowed(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message, success: false }, { status: 429 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = userStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email é obrigatório', success: false }, { status: 400 });
  }
  return NextResponse.json({
    success: true,
    nextStep: 'unlock',
    message: 'Se a conta estiver bloqueada, prossiga com o desbloqueio.',
  });
});
