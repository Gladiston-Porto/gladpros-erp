import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { approveProposal } from '@/domains/proposals/services';
import { logger } from '@/lib/api/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/propostas/[id]/approve - Approve signed proposta
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  const propostaId = parseInt(id);

  if (isNaN(propostaId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const result = await approveProposal(propostaId, {
    actorId: user.id,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  if (!result.success) {
    logger.error('[Propostas] Falha ao aprovar proposta', { url: request.url }, new Error(result.error))
    return NextResponse.json({ error: result.error, success: false }, { status: 422 });
  }

  return NextResponse.json({
    data: result.data,
    message: 'Proposta aprovada com sucesso',
    success: true,
  });
});
