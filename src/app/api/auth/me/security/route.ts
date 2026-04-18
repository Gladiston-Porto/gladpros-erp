// src/app/api/auth/me/security/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";
import { z } from "zod";
import { PasswordService } from "@/shared/lib/password";
import { SecurityService } from "@/shared/lib/security";
import { AuditLogger } from "@/shared/lib/audit";
import { revokeAllUserTokens } from "@/lib/auth/token-service";

export const runtime = "nodejs";

const ChangePasswordSchema = z.object({
  action: z.literal("change-password"),
  senhaAtual: z.string().min(1, "Senha atual obrigatória"),
  novaSenha: z.string()
    .min(9, "A senha deve ter no mínimo 9 caracteres")
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "A senha deve conter ao menos um número")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "A senha deve conter ao menos um símbolo especial"),
});

const ChangePinSchema = z.object({
  action: z.literal("change-pin"),
  novoPIN: z.string().regex(/^\d{4}$/, "PIN deve ter exatamente 4 dígitos"),
  senhaAtual: z.string().min(1, "Senha atual obrigatória para alterar o PIN"),
});

const ChangeSecuritySchema = z.object({
  action: z.literal("change-security"),
  perguntaSecreta: z.string().min(5, "Pergunta deve ter ao menos 5 caracteres").max(191),
  respostaSecreta: z.string().min(2, "Resposta deve ter ao menos 2 caracteres").max(191),
  senhaAtual: z.string().min(1, "Senha atual obrigatória para alterar a questão de segurança"),
});

const SecuritySchema = z.discriminatedUnion("action", [
  ChangePasswordSchema,
  ChangePinSchema,
  ChangeSecuritySchema,
]);

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const me = await requireUser(req);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido", success: false }, { status: 400 });
  }

  const parsed = SecuritySchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstMsg = Object.values(issues.fieldErrors).flat()[0] ?? issues.formErrors[0] ?? "Dados inválidos";
    return NextResponse.json({ error: firstMsg, success: false }, { status: 400 });
  }

  const userId = Number(me.id);

  // Buscar senha atual do usuário para verificação
  const rows = await prisma.$queryRaw<Array<{ senha: string | null; email: string }>>`
    SELECT senha, email FROM Usuario WHERE id = ${userId} LIMIT 1
  `;
  const userRow = rows[0];
  if (!userRow) return NextResponse.json({ error: "Usuário não encontrado", success: false }, { status: 404 });

  const data = parsed.data;

  // Todos os actions requerem senha atual
  const senhaAtual = (data as { senhaAtual: string }).senhaAtual;
  if (!userRow.senha) {
    return NextResponse.json({ error: "Conta não possui senha definida. Use o fluxo de primeiro acesso.", success: false }, { status: 400 });
  }
  const senhaValida = await PasswordService.verifyPassword(senhaAtual, userRow.senha);
  if (!senhaValida) {
    return NextResponse.json({ error: "Senha atual incorreta", success: false }, { status: 400 });
  }

  if (data.action === "change-password") {
    // Verificar reutilização de senha (últimas 5)
    const isReused = await SecurityService.isPasswordReused(userId, data.novaSenha);
    if (isReused) {
      return NextResponse.json({ error: "Esta senha já foi utilizada recentemente. Escolha uma senha diferente.", success: false }, { status: 400 });
    }

    const hash = await PasswordService.hashPassword(data.novaSenha);

    // Atualizar senha e incrementar tokenVersion para invalidar todas as sessões ativas
    await prisma.$executeRaw`
      UPDATE Usuario SET
        senha = ${hash},
        senhaProvisoria = FALSE,
        tokenVersion = COALESCE(tokenVersion, 0) + 1,
        atualizadoEm = NOW()
      WHERE id = ${userId}
    `;

    // Gravar no histórico de senhas
    await SecurityService.addPasswordToHistory(userId, hash);

    // Revogar todos os refresh tokens
    await revokeAllUserTokens(userId, 'Troca de senha pelo usuário').catch(() => {});

    // Audit log
    await AuditLogger.logPasswordChange(userId, userRow.email, req, 'CHANGE');

    return NextResponse.json({ success: true, message: "Senha alterada com sucesso. Faça login novamente." });
  }

  if (data.action === "change-pin") {
    const hash = await PasswordService.hashPassword(data.novoPIN);
    await prisma.$executeRaw`UPDATE Usuario SET pinSeguranca = ${hash}, atualizadoEm = NOW() WHERE id = ${userId}`;

    // Audit log
    await AuditLogger.log({
      userId, userEmail: userRow.email,
      action: 'SECURITY_CHANGE', resource: 'Usuario', resourceId: String(userId),
      details: { type: 'PIN_CHANGE' },
      ip: AuditLogger.getClientInfo(req).ip,
      userAgent: AuditLogger.getClientInfo(req).userAgent,
      status: 'SUCCESS'
    });

    return NextResponse.json({ success: true, message: "PIN alterado com sucesso" });
  }

  if (data.action === "change-security") {
    const hash = await PasswordService.hashPassword(data.respostaSecreta.toLowerCase().trim());
    await prisma.$executeRaw`
      UPDATE Usuario SET
        perguntaSecreta = ${data.perguntaSecreta},
        respostaSecreta = ${hash},
        atualizadoEm = NOW()
      WHERE id = ${userId}
    `;

    // Audit log
    await AuditLogger.log({
      userId, userEmail: userRow.email,
      action: 'SECURITY_CHANGE', resource: 'Usuario', resourceId: String(userId),
      details: { type: 'SECURITY_QUESTION_CHANGE' },
      ip: AuditLogger.getClientInfo(req).ip,
      userAgent: AuditLogger.getClientInfo(req).userAgent,
      status: 'SUCCESS'
    });

    return NextResponse.json({ success: true, message: "Pergunta e resposta de segurança atualizadas" });
  }

  return NextResponse.json({ error: "Ação desconhecida", success: false }, { status: 400 });
});
