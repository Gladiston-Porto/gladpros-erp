import { NextRequest, NextResponse } from "next/server";
import { SecurityService } from "@/shared/lib/security";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { checkUserManagementAccess } from "../../_helpers/access";

interface Params {
  id: string;
}

// GET - Listar sessões ativas do usuário
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
        { error: "Bad Request", message: "ID de usuário inválido", success: false },
        { status: 400 }
      );
    }

    const access = await checkUserManagementAccess(authUser, userId, { allowSelf: true });
    if (!access.allowed) return access.response;

  const sessions = await SecurityService.getUserSessions(userId);
  return NextResponse.json({ data: sessions, success: true });
  });

// DELETE - Revogar todas as sessões do usuário
export const DELETE = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);

    if (!can(authUser.role as Role, 'usuarios', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Acesso negado', success: false }, { status: 403 });
    }

    const rateCheck = await apiRateLimit.isAllowed(request);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      );
    }
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Bad Request", message: "ID de usuário inválido", success: false },
        { status: 400 }
      );
    }

    const access = await checkUserManagementAccess(authUser, userId, { allowSelf: true });
    if (!access.allowed) return access.response;

    await SecurityService.revokeAllUserSessions(userId);

    return NextResponse.json({
      data: null,
      success: true,
      message: "Todas as sessões foram revogadas com sucesso",
    });
  });
