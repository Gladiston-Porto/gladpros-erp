import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { checkUserManagementAccess } from "../../_helpers/access";

interface Params {
  id: string;
}

// GET - Status de segurança do usuário (bloqueio e último login)
export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);

    if (!can(authUser.role as Role, 'usuarios', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Acesso negado', success: false }, { status: 403 });
    }

    // Only ADMIN/GERENTE can view security info of other users
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ message: "ID de usuário inválido" }, { status: 400 });
    }

    const access = await checkUserManagementAccess(authUser, userId, { allowSelf: true });
    if (!access.allowed) return access.response;

    const rows = await prisma.$queryRaw<Array<{
      id: number;
      bloqueado: number | boolean;
      bloqueadoEm: Date | null;
      ultimoLoginEm: Date | null;
    }>>`
      SELECT id, bloqueado, bloqueadoEm, ultimoLoginEm
      FROM Usuario
      WHERE id = ${userId}
      LIMIT 1
    `;

    const u = rows[0];
    if (!u) return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });

    const blocked = typeof u.bloqueado === 'boolean' ? u.bloqueado : u.bloqueado === 1;
    return NextResponse.json({
      id: u.id,
      blocked,
      blockedAt: u.bloqueadoEm ? u.bloqueadoEm.toISOString() : null,
      lastSuccessfulLoginAt: u.ultimoLoginEm ? u.ultimoLoginEm.toISOString() : null
    });
  });
