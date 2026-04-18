// src/app/api/auth/user-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userStatusSchema } from "@/shared/lib/validation";
import { withErrorHandler } from '@/lib/api/error-handler';
import { RateLimiter } from "@/shared/lib/rate-limit";

// Rate limit — 10 req/minuto por IP (previne enumeração em massa)
const userStatusRateLimit = new RateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Muitas solicitações. Aguarde um momento.'
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
      return NextResponse.json(
        { error: "Email é obrigatório", success: false },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    // Buscar usuário e informações de bloqueio
    const userRows = await prisma.$queryRaw<Array<{
      id: number;
      email: string;
      nomeCompleto: string;
      bloqueado: boolean;
      pinSeguranca: string | null;
      perguntaSecreta: string | null;
    }>>`
      SELECT id, email, nomeCompleto, bloqueado, pinSeguranca, perguntaSecreta
      FROM Usuario 
      WHERE email = ${email}
      LIMIT 1
    `;

    const user = userRows[0];

    // Não revelar se o email existe ou não — retornar resposta genérica
    if (!user) {
      return NextResponse.json({
        blocked: false,
        success: true
      });
    }

    if (!user.bloqueado) {
      return NextResponse.json({
        blocked: false,
        success: true
      });
    }

    return NextResponse.json({
      blocked: true,
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nomeCompleto: user.nomeCompleto,
        requiresPinUnlock: !!user.pinSeguranca,
        requiresSecurityQuestion: !!user.perguntaSecreta,
        perguntaSecreta: user.perguntaSecreta
      }
    });

  });
