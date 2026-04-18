// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sha256Hex } from "@/shared/lib/tokens";
import { resetPasswordApiSchema } from "@/shared/lib/validation";
import { withErrorHandler } from '@/lib/api/error-handler';
import { PasswordService } from "@/shared/lib/password";
import { SecurityService } from "@/shared/lib/security";
import { AuditLogger } from "@/shared/lib/audit";
import { revokeAllUserTokens } from "@/lib/auth/token-service";
import { resetPasswordRateLimit } from "@/shared/lib/rate-limit";

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting
  const rl = await resetPasswordRateLimit.isAllowed(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message, success: false }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = resetPasswordApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Token inválido ou senha fraca", success: false }, { status: 400 });
  }
  const { token, senha } = parsed.data;

  const tokenHash = sha256Hex(String(token));

  // Buscar token válido
  const rows: Array<{ id: number; userId: number; expiresAt: Date; used: boolean }> = await prisma.$queryRaw`
    SELECT id, userId, expiresAt, used
    FROM PasswordResetToken
    WHERE tokenHash = ${tokenHash}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  const t = rows[0];
  if (!t) return NextResponse.json({ error: "Token inválido", success: false }, { status: 400 });
  if (t.used) return NextResponse.json({ error: "Token já utilizado", success: false }, { status: 400 });
  if (new Date() > t.expiresAt) return NextResponse.json({ error: "Token expirado", success: false }, { status: 400 });

  // Validar força da senha
  const validation = PasswordService.validatePassword(String(senha));
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0], success: false }, { status: 400 });
  }

  // Verificar reutilização de senha
  const isReused = await SecurityService.isPasswordReused(t.userId, String(senha));
  if (isReused) {
    return NextResponse.json({ error: "Esta senha já foi utilizada recentemente. Escolha uma senha diferente.", success: false }, { status: 400 });
  }

  const senhaHash = await PasswordService.hashPassword(String(senha));

  // Atualizar senha, invalidar sessões (tokenVersion++) e marcar token como usado
  await prisma.$executeRaw`
    UPDATE Usuario 
    SET senha = ${senhaHash},
        senhaProvisoria = FALSE,
        tokenVersion = COALESCE(tokenVersion, 0) + 1,
        atualizadoEm = NOW()
    WHERE id = ${t.userId}
  `;

  await prisma.$executeRaw`
    UPDATE PasswordResetToken SET used = TRUE WHERE id = ${t.id}
  `;

  // Gravar no histórico de senhas
  await SecurityService.addPasswordToHistory(t.userId, senhaHash);

  // Revogar todos os refresh tokens
  await revokeAllUserTokens(t.userId, 'Reset de senha via token').catch(() => {});

  // Buscar email para audit log 
  const userEmail = await prisma.$queryRaw<Array<{ email: string }>>`
    SELECT email FROM Usuario WHERE id = ${t.userId} LIMIT 1
  `;
  if (userEmail[0]) {
    await AuditLogger.logPasswordChange(t.userId, userEmail[0].email, req, 'RESET');
  }

  return NextResponse.json({ success: true, message: "Senha redefinida com sucesso. Faça login novamente." });
});
