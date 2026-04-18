import { NextRequest, NextResponse } from "next/server";
import { SecurityService } from "@/shared/lib/security";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";

interface Params {
  sessionId: string;
}

// DELETE - Revogar sessão específica
export const DELETE = withErrorHandler(async (request: NextRequest,
  { params }: { params: Promise<Params> }) => {
    // Only authenticated ADMIN/GERENTE can revoke sessions
    const authUser = await requireUser(request);
    if (!['ADMIN', 'GERENTE'].includes(authUser.role)) {
      return NextResponse.json({ message: "Acesso negado" }, { status: 403 });
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
