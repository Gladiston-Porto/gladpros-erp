import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/shared/lib/security';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import {
  canAccessSessionOwner,
  getSessionOwner,
  sessionNotFoundResponse,
  userManagementForbiddenResponse,
} from '../../_helpers/access';

interface Params {
  sessionId: string;
}

// DELETE - Revogar sessão específica
export const DELETE = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<Params> }) => {
    const authUser = await requireUser(request);

    if (!can(authUser.role as Role, 'usuarios', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Acesso negado', success: false },
        { status: 403 },
      );
    }

    const rateCheck = await apiRateLimit.isAllowed(request);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) },
        },
      );
    }

    const { sessionId } = await params;
    const id = parseInt(sessionId);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'INVALID_ID', message: 'ID de sessão inválido', success: false },
        { status: 400 },
      );
    }

    const owner = await getSessionOwner(id);
    if (!owner) return sessionNotFoundResponse();
    if (!canAccessSessionOwner(authUser, owner)) return userManagementForbiddenResponse();

    await SecurityService.revokeSession(id);

    return NextResponse.json({
      data: null,
      success: true,
      message: 'Sessão revogada com sucesso',
    });
  },
);
