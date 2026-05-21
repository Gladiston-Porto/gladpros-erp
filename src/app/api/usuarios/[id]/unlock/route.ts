// src/app/api/usuarios/[id]/unlock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { withErrorHandler } from "@/lib/api/error-handler";
import { AuditLogger } from "@/shared/lib/audit";
import { logger } from "@/lib/api/logger";

interface Params {
  id: string;
}

/**
 * POST /api/usuarios/[id]/unlock
 *
 * Desbloqueio administrativo — ADMIN desbloqueia conta travada por
 * tentativas excessivas de login/MFA, sem precisar de PIN ou pergunta de segurança.
 *
 * Diferente de /api/auth/unlock (self-service via PIN), esta rota exige auth ADMIN.
 */
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<Params> }) => {
  const authUser = await requireUser(req);

  if (!can(authUser.role as Role, "usuarios", "update")) {
    return NextResponse.json(
      { error: "Acesso negado. Apenas administradores podem desbloquear usuários.", success: false },
      { status: 403 }
    );
  }

  const { id } = await params;
  const userId = Number(id);

  if (!userId || isNaN(userId)) {
    return NextResponse.json({ error: "ID inválido", success: false }, { status: 400 });
  }

  // Impedir que admin se desbloqueie via esta rota (evitar inconsistência lógica)
  if (Number(authUser.id) === userId) {
    return NextResponse.json(
      { error: "Use o fluxo de desbloqueio padrão para a própria conta.", success: false },
      { status: 400 }
    );
  }

  const rows = await prisma.$queryRaw<Array<{
    id: number;
    email: string;
    nomeCompleto: string;
    bloqueado: number | boolean;
    status: string;
  }>>`
    SELECT id, email, nomeCompleto, bloqueado, status
    FROM Usuario
    WHERE id = ${userId} AND empresaId = ${authUser.empresaId}
    LIMIT 1
  `;

  const target = rows[0];

  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado", success: false }, { status: 404 });
  }

  const isBloqueado = typeof target.bloqueado === "boolean"
    ? target.bloqueado
    : target.bloqueado === 1;

  if (!isBloqueado) {
    return NextResponse.json(
      { error: "Usuário não está bloqueado.", success: false },
      { status: 400 }
    );
  }

  // Desbloquear: limpar bloqueado + bloqueadoEm
  await prisma.usuario.update({
    where: { id: userId },
    data: {
      bloqueado: false,
      bloqueadoEm: null,
      atualizadoEm: new Date(),
    },
  });

  // Auditoria
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await AuditLogger.log({
      userId: Number(authUser.id),
      action: 'UPDATE_USER',
      resource: 'Usuario',
      resourceId: String(userId),
      ip,
      details: { before: { bloqueado: true }, after: { bloqueado: false } },
      status: 'SUCCESS',
    });
  } catch (auditError) {
    logger.error("[unlock] Erro ao registrar auditoria", {}, auditError);
  }

  return NextResponse.json({
    data: { id: userId, bloqueado: false },
    success: true,
    message: "Conta desbloqueada com sucesso.",
  });
});
