import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { checkUserManagementAccess } from "../../_helpers/access";

interface Params {
  id: string;
}

export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);

    if (!can(authUser.role as Role, 'usuarios', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Acesso negado', success: false }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "ID de usuário inválido" },
        { status: 400 }
      );
    }

    const access = await checkUserManagementAccess(authUser, userId, { allowSelf: false });
    if (!access.allowed) return access.response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50")));
    const offset = (page - 1) * pageSize;

    // Buscar logs de auditoria relacionados ao usuário com paginação real
    const [auditorias, countRows] = await Promise.all([
      prisma.$queryRaw`
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
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) AS cnt
        FROM Auditoria a
        WHERE (a.registroId = ${userId} AND a.tabela = 'Usuario')
           OR (a.usuarioId = ${userId} AND a.tabela = 'Usuario')
      `,
    ]);

    const total = Number((countRows as Array<{ cnt: bigint }>)[0]?.cnt ?? 0);

    return NextResponse.json({
      data: auditorias,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      success: true,
    });
  });
