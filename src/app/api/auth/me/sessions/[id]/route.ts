// src/app/api/auth/me/sessions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api/error-handler";

export const runtime = "nodejs";

// DELETE /api/auth/me/sessions/[id] — encerra uma sessão específica
export const DELETE = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const me = await requireUser(req);
  const userId = Number(me.id);
  const { id } = await params;
  const sessionId = Number(id);

  if (isNaN(sessionId)) {
    return NextResponse.json(
      { error: "ID inválido", message: "O ID da sessão deve ser numérico", success: false },
      { status: 400 }
    );
  }

  // Verificar que a sessão pertence ao usuário logado (segurança)
  const rows = await prisma.$queryRaw<Array<{ id: number; token: string }>>`
    SELECT id, token FROM SessaoAtiva
    WHERE id = ${sessionId} AND usuarioId = ${userId}
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json(
      { error: "Sessão não encontrada", message: "A sessão não existe ou não pertence a você", success: false },
      { status: 404 }
    );
  }

  await prisma.$executeRaw`
    DELETE FROM SessaoAtiva WHERE id = ${sessionId} AND usuarioId = ${userId}
  `;

  await prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      entidade: "SessaoAtiva",
      entidadeId: String(sessionId),
      acao: "REVOKE_SESSION",
      diff: JSON.stringify({ sessionId }),
    },
  });

  return NextResponse.json({ success: true, message: "Sessão encerrada com sucesso" });
});
