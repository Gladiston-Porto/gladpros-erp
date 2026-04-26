import { NextRequest, NextResponse } from "next/server";
import { SecurityService } from "@/shared/lib/security";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { apiRateLimit } from '@/shared/lib/rate-limit';

interface Params {
  sessionId: string;
}

// DELETE - Revogar sessão específica
export const DELETE = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    const rateCheck = await apiRateLimit.isAllowed(request);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      );
    }
    // Only ADMIN/GERENTE can revoke sessions (roles with update permission on usuarios)
    const authUser = await requireUser(request);
    if (!can(authUser.role as Role, 'usuarios', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: "Acesso negado", success: false }, { status: 403 });
    }

    const { sessionId } = await params;
    const id = parseInt(sessionId);

    if (isNaN(id)) {
      return NextResponse.json(
        { message: "ID de sessão inválido" },
        { status: 400 }
      );
    }

    await SecurityService.revokeSession(id);
    
    return NextResponse.json({ 
      message: "Sessão revogada com sucesso" 
    });
  });
