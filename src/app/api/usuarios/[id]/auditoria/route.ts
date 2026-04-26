import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";

interface Params {
  id: string;
}

export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);

    // Only ADMIN/GERENTE can view audit logs (roles with update permission on usuarios)
    if (!can(authUser.role as Role, 'usuarios', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: "Acesso negado", success: false }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "ID de usuário inválido" },
        { status: 400 }
      );
    }

    // Buscar logs de auditoria relacionados ao usuário
    const auditorias = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.tabela,
        a.registroId,
        a.acao,
        a.usuarioId,
        a.ip,
        a.payload,
        a.criadoEm,
        u.nomeCompleto,
        u.email
      FROM Auditoria a
      LEFT JOIN Usuario u ON a.usuarioId = u.id
      WHERE (a.registroId = ${userId} AND a.tabela = 'Usuario')
         OR (a.usuarioId = ${userId} AND a.tabela = 'Usuario')
      ORDER BY a.criadoEm DESC
      LIMIT 100
    `;

    return NextResponse.json({ data: auditorias, success: true });
  });
