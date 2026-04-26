import { NextRequest, NextResponse } from "next/server";
import { SecurityService } from "@/shared/lib/security";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { apiRateLimit } from '@/shared/lib/rate-limit';

interface Params {
  id: string;
}

// GET - Listar sessões ativas do usuário
export const GET = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);
    const { id } = await params;
    const userId = parseInt(id);

    // Only ADMIN/GERENTE can view other users' sessions
    if (Number(authUser.id) !== userId && !can(authUser.role as Role, 'usuarios', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: "Acesso negado", success: false }, { status: 403 });
    }

    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "ID de usuário inválido" },
        { status: 400 }
      );
    }

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

    // Owner pode revogar as próprias sessões; ADMIN/GERENTE podem revogar de outros
    if (Number(authUser.id) !== userId && !can(authUser.role as Role, 'usuarios', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: "Acesso negado", success: false }, { status: 403 });
    }

    await SecurityService.revokeAllUserSessions(userId);

    return NextResponse.json({
      message: "Todas as sessões foram revogadas com sucesso"
    });
  });
