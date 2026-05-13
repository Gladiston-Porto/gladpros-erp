import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageRole, UserRole } from "@/shared/lib/user-hierarchy";

type AuthUser = {
  id: number | string;
  role: string;
};

type AccessResult =
  | { allowed: true; targetRole: UserRole }
  | { allowed: false; response: NextResponse };

function forbiddenResponse() {
  return NextResponse.json(
    { error: "Forbidden", message: "Você não pode gerenciar este usuário.", success: false },
    { status: 403 }
  );
}

function notFoundResponse() {
  return NextResponse.json(
    { error: "Not Found", message: "Usuário não encontrado", success: false },
    { status: 404 }
  );
}

export async function checkUserManagementAccess(
  authUser: AuthUser,
  targetUserId: number,
  options: { allowSelf: boolean }
): Promise<AccessResult> {
  const target = await prisma.usuario.findUnique({
    where: { id: targetUserId },
    select: { nivel: true },
  });

  if (!target) {
    return { allowed: false, response: notFoundResponse() };
  }

  const targetRole = target.nivel as UserRole;
  const isSelf = Number(authUser.id) === targetUserId;

  if (options.allowSelf && isSelf) {
    return { allowed: true, targetRole };
  }

  if (!canManageRole(authUser.role as UserRole, targetRole)) {
    return { allowed: false, response: forbiddenResponse() };
  }

  return { allowed: true, targetRole };
}

export async function getSessionOwner(sessionId: number) {
  const rows = await prisma.$queryRaw<Array<{ usuarioId: number; nivel: UserRole }>>`
    SELECT s.usuarioId, u.nivel
    FROM SessaoAtiva s
    INNER JOIN Usuario u ON u.id = s.usuarioId
    WHERE s.id = ${sessionId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export function canAccessSessionOwner(authUser: AuthUser, owner: { usuarioId: number; nivel: UserRole }) {
  if (Number(authUser.id) === owner.usuarioId) return true;
  return canManageRole(authUser.role as UserRole, owner.nivel);
}

export function sessionNotFoundResponse() {
  return NextResponse.json(
    { error: "Not Found", message: "Sessão não encontrada", success: false },
    { status: 404 }
  );
}

export { forbiddenResponse as userManagementForbiddenResponse };
