import { withErrorHandler } from '@/lib/api/error-handler';
import { logger } from "@/lib/api/logger";
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateToken, sha256Hex } from "@/shared/lib/tokens"
import { EmailService } from "@/shared/lib/email"
import { forgotPasswordSchema } from "@/shared/lib/validation"
import { resetPasswordRateLimit } from "@/shared/lib/rate-limit"

function getAppUrl() {
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("APP_URL is required to generate password reset links");
  return appUrl.replace(/\/$/, "");
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting — 3 req/hora por IP
  const rl = await resetPasswordRateLimit.isAllowed(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message, success: false }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}))
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "E-mail inválido", success: false }, { status: 422 })
  const email = parsed.data.email
  const genericMessage = "Se o e-mail existir, você receberá instruções para redefinir a senha."

  const rows: Array<{ id: number; email: string }> = await prisma.$queryRaw`
    SELECT id, email FROM Usuario WHERE email = ${email.toLowerCase().trim()} LIMIT 1
  `
  const user = rows[0]

  // Sempre responder 200 para não revelar existência
  if (user) {
    const raw = generateToken(32)
    const tokenHash = sha256Hex(raw)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1h

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    const resetUrl = `${getAppUrl()}/reset-senha/${raw}`

    EmailService.prewarm()
    void EmailService.sendPasswordReset({
        to: user.email,
        userName: user.email,
        resetLink: resetUrl,
        expiresInHours: 1
      }).then((result) => {
      if (!result.success) {
        logger.warn("[ForgotPassword] Falha no envio de email", { error: result.error })
      }
    }).catch((err) => {
      logger.error("Falha ao enviar e-mail de reset", {}, err as Error)
    })
  }

  return NextResponse.json({ success: true, message: genericMessage })
});
