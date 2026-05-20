// src/app/api/usuarios/[id]/role-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { withErrorHandler } from "@/lib/api/error-handler";
import { checkUserManagementAccess } from "../../_helpers/access";

interface Params {
  id: string;
}

interface AuditoriaRow {
  id: number;
  acao: string;
  usuarioId: number | null;
  payload: string | null;
  criadoEm: Date;
  nomeCompleto: string | null;
  email: string | null;
}

/**
 * GET /api/usuarios/[id]/role-history
 *
 * Retorna o histórico de mudanças de role (nivel) de um usuário,
 * filtrando apenas as entradas do AuditLog onde before.nivel !== after.nivel.
 *
 * RBAC: ADMIN apenas (via checkUserManagementAccess allowSelf: false).
 */
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<Params> }) => {
  const authUser = await requireUser(request);

  if (!can(authUser.role as Role, 'usuarios', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Acesso negado', success: false }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    return NextResponse.json({ error: "ID inválido", success: false }, { status: 400 });
  }

  const access = await checkUserManagementAccess(authUser, userId, { allowSelf: false });
  if (!access.allowed) return access.response;

  // Buscar todos os UPDATE no registro do usuário — filtrar por nivel no servidor
  const rows = (await prisma.$queryRaw`
    SELECT
      a.id,
      a.acao,
      a.usuarioId,
      a.payload,
      a.criadoEm,
      u.nomeCompleto,
      u.email
    FROM Auditoria a
    LEFT JOIN Usuario u ON a.usuarioId = u.id
    WHERE a.registroId = ${userId}
      AND a.tabela = 'Usuario'
      AND a.acao = 'UPDATE'
    ORDER BY a.criadoEm DESC
    LIMIT 200
  `) as AuditoriaRow[];

  // Filtrar apenas as entradas que têm mudança de nivel
  const roleChanges = rows
    .map((row) => {
      let payload: Record<string, unknown> = {};
      try {
        if (row.payload) payload = JSON.parse(row.payload) as Record<string, unknown>;
      } catch {
        // ignore
      }

      const before = payload.before as Record<string, unknown> | undefined;
      const after = payload.after as Record<string, unknown> | undefined;

      if (!before || !after) return null;
      if (before.nivel === after.nivel) return null;

      return {
        id: row.id,
        criadoEm: row.criadoEm instanceof Date ? row.criadoEm.toISOString() : String(row.criadoEm),
        changedBy: {
          nomeCompleto: row.nomeCompleto ?? row.email ?? "Sistema",
          email: row.email ?? null,
        },
        de: String(before.nivel ?? "—"),
        para: String(after.nivel ?? "—"),
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    data: roleChanges,
    success: true,
  });
});
