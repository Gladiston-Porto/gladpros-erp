// src/app/api/auth/unlock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BlockingService } from "@/shared/lib/blocking";
import { AuditLogger } from "@/shared/lib/audit";
import { unlockSchema } from "@/shared/lib/validation";
import { withErrorHandler } from '@/lib/api/error-handler';
import { RateLimiter } from "@/shared/lib/rate-limit";

// Rate limit para desbloqueio — 3 tentativas por 15 minutos
// PIN de 4 dígitos = 10.000 combinações, sem rate limit seria brute-forceável em minutos
const unlockRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3,
  message: 'Muitas tentativas de desbloqueio. Aguarde 15 minutos.'
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
        { error: "Dados inválidos para desbloqueio", success: false },
        { status: 400 }
      );
    }
    const { method, userId } = parsed.data as { method: 'pin' | 'security'; userId: number };

    // Verificar se usuário existe e está bloqueado
    const userRows = await prisma.$queryRaw<Array<{
      id: number;
      email: string;
      nomeCompleto: string;
      bloqueado: boolean;
    }>>`
      SELECT id, email, nomeCompleto, bloqueado
      FROM Usuario 
      WHERE id = ${userId}
      LIMIT 1
    `;

    const user = userRows[0];

    if (!user) {
      // [SEC] Retornar 400 genérico (igual ao caso "não bloqueado") para evitar enumeração de userId.
      // Um 404 vs 400 deixaria o atacante descobrir quais IDs existem no sistema.
      return NextResponse.json(
        { error: "Usuário não está bloqueado", success: false },
        { status: 400 }
      );
    }

    if (!user.bloqueado) {
      return NextResponse.json(
        { error: "Usuário não está bloqueado", success: false },
        { status: 400 }
      );
    }

    let unlockResult: { success: boolean; error?: string };

    // Tentar desbloqueio com método escolhido
    if (method === 'pin') {
      const { pin } = parsed.data as { method: 'pin'; userId: number; pin: string };
      if (!pin) {
        return NextResponse.json(
          { error: "PIN é obrigatório", success: false },
          { status: 400 }
        );
      }
      unlockResult = await BlockingService.unlockWithPin(userId, pin);
    } else {
      const { answer } = parsed.data as { method: 'security'; userId: number; answer: string };
      if (!answer) {
        return NextResponse.json(
          { error: "Resposta de segurança é obrigatória", success: false },
          { status: 400 }
        );
      }
      unlockResult = await BlockingService.unlockWithSecurityQuestion(userId, answer);
    }

    if (!unlockResult.success) {
      // Log tentativa de desbloqueio falhada
      await AuditLogger.logLogin(userId, user.email, req, false, {
        action: 'unlock_attempt',
        method,
        reason: unlockResult.error
      });

      return NextResponse.json(
        { error: unlockResult.error, success: false },
        { status: 401 }
      );
    }

    // Log desbloqueio bem-sucedido
    await AuditLogger.logLogin(userId, user.email, req, true, {
      action: 'unlock_success',
      method,
      unlockedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: "Conta desbloqueada com sucesso"
    });

  });
