// src/app/api/auth/mfa/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MFAService } from '@/shared/lib/mfa';
import { EmailService } from '@/shared/lib/email';
import { mfaRequestSchema } from '@/shared/lib/validation';
import { withErrorHandler } from '@/lib/api/error-handler';
import { mfaRateLimit } from '@/shared/lib/rate-limit';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = mfaRequestSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: 'INVALID_BODY', message: 'email obrigatório', success: false },
      { status: 400 },
    );
  const { email } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const rl = await mfaRateLimit.isAllowed(req, `mfa:request:${normalizedEmail}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message, success: false }, { status: 429 });
  }

  type UserRow = {
    id: number;
    email: string;
    status: string;
    nome?: string | null;
    primeiroAcesso?: boolean;
  };
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, email, status, nomeCompleto as nome, primeiroAcesso FROM Usuario WHERE email = ${normalizedEmail} LIMIT 1
  `;
  const user = rows[0];
  if (!user || user.status !== 'ATIVO') {
    // evite enumerar: responda 200 mesmo assim
    return NextResponse.json({ success: true });
  }

  const { code } = await MFAService.createMFACode({ usuarioId: user.id, tipoAcao: 'LOGIN' });
  const ttl = Number(process.env.MFA_CODE_TTL_MIN ?? 5);
  EmailService.prewarm();

  const sendResult = await EmailService.sendMFA({
    to: user.email,
    userName: user.nome || user.email,
    code,
    expiresInMinutes: ttl,
    isFirstAccess: Boolean(user.primeiroAcesso),
  }).catch(() => ({ success: false }));

  if (!sendResult.success) {
    return NextResponse.json(
      {
        error: 'Nao foi possivel enviar o codigo de verificacao. Tente novamente em instantes.',
        message: 'MFA_DELIVERY_FAILED',
        success: false,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ success: true });
});
