import { NextRequest, NextResponse } from "next/server";
import { SecurityService } from "@/shared/lib/security";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { checkUserManagementAccess } from "../../_helpers/access";

interface Params {
  id: string;
}

// GET - Listar sessões ativas do usuário
export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "ID de usuário inválido" },
        { status: 400 }
      );
    }

    const access = await checkUserManagementAccess(authUser, userId, { allowSelf: true });
    if (!access.allowed) return access.response;

  const sessions = await SecurityService.getUserSessions(userId);
  return NextResponse.json({ sessions });
  });

// DELETE - Revogar todas as sessões do usuário
export const DELETE = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const rateCheck = await apiRateLimit.isAllowed(request);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      );
    }
    const authUser = await requireUser(request);
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "ID de usuário inválido" },
        { status: 400 }
      );
    }

    const access = await checkUserManagementAccess(authUser, userId, { allowSelf: true });
    if (!access.allowed) return access.response;

    await SecurityService.revokeAllUserSessions(userId);

    return NextResponse.json({
      message: "Todas as sessões foram revogadas com sucesso"
    });
  });
