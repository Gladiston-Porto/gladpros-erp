// src/app/api/auth/mfa/resend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MFAService } from "@/shared/lib/mfa";
import { mfaResendSchema } from "@/shared/lib/validation";
import { withErrorHandler } from '@/lib/api/error-handler';
import { logger } from "@/lib/api/logger";
import { mfaRateLimit } from "@/shared/lib/rate-limit";
import { createMfaChallenge, verifyMfaChallenge } from "@/shared/lib/mfa-challenge";

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0] || 
         req.headers.get("x-real-ip") || 
         req.headers.get("cf-connecting-ip") || 
         "unknown";
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent") || undefined;
  

    const raw = await req.json().catch(() => ({}));
    const parsed = mfaResendSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório", success: false },
        { status: 400 }
      );
    }
    const { userId, tipoAcao = "LOGIN", challenge } = parsed.data;
    const tipoAcaoMapped: "LOGIN" | "RESET" | "PRIMEIRO_ACESSO" | "DESBLOQUEIO" =
      tipoAcao === "RESET_PASSWORD" ? "RESET" : (tipoAcao as "LOGIN" | "RESET" | "PRIMEIRO_ACESSO" | "DESBLOQUEIO");

    if (!verifyMfaChallenge(challenge, { userId, tipoAcao: tipoAcaoMapped })) {
      return NextResponse.json(
        { error: "MFA_CHALLENGE_INVALID", message: "Sessão MFA inválida ou expirada.", success: false },
        { status: 401 }
      );
    }

    const rl = await mfaRateLimit.isAllowed(req, `mfa:resend:${userId}:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: rl.message, success: false },
        { status: 429 }
      );
    }

    // Buscar dados do usuário
    const userRows = await prisma.$queryRaw<Array<{
      id: number;
      email: string;
      nomeCompleto: string;
      primeiroAcesso: boolean;
      status: string;
    }>>`
      SELECT id, email, nomeCompleto, primeiroAcesso, status
      FROM Usuario 
      WHERE id = ${userId}
      LIMIT 1
    `;

    const user = userRows[0];
    if (!user) {
      return NextResponse.json(
        { success: true, message: "Se houver uma sessão MFA válida, um novo código será enviado." },
        { status: 200 }
      );
    }

    if (user.status !== "ATIVO") {
      return NextResponse.json(
        { success: true, message: "Se houver uma sessão MFA válida, um novo código será enviado." },
        { status: 200 }
      );
    }

    // Verificar rate limiting - máximo 3 códigos por 15 minutos
  const recentAttempts = await MFAService.countRecentAttempts(userId, 15);
    if (recentAttempts >= 3) {
      return NextResponse.json(
        { error: "Muitas solicitações. Aguarde 15 minutos antes de solicitar um novo código.", success: false },
        { status: 429 }
      );
    }

    // Pré-aquecer SMTP em background para reduzir latência do primeiro envio
    const { EmailService } = await import("@/shared/lib/email");
    EmailService.prewarm();

    // Gerar novo código MFA
    const { code: mfaCode } = await MFAService.createMFACode({
      usuarioId: user.id,
      tipoAcao: tipoAcaoMapped,
      ip,
      userAgent
    });

    // Enviar código por email — fire-and-forget para não bloquear resposta
    EmailService.sendMFA({
      to: user.email,
      userName: user.nomeCompleto,
      code: mfaCode,
      expiresInMinutes: 5,
      isFirstAccess: user.primeiroAcesso
    }).catch((err) => {
      logger.warn("[MFA/resend] Falha ao enviar email (non-blocking)", { error: err });
    });

    return NextResponse.json({
      success: true,
      message: "Novo código enviado com sucesso",
      challenge: createMfaChallenge({ userId: user.id, tipoAcao: tipoAcaoMapped })
    });

});
