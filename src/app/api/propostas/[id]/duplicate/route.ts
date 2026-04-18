import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { duplicateProposal } from '@/domains/proposals/services';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/propostas/[id]/duplicate - Duplicate proposta
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  const { id } = await params;
  const propostaId = parseInt(id);

  if (isNaN(propostaId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const result = await duplicateProposal(propostaId, {
    actorId: user.id,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    message: 'Proposta duplicada com sucesso',
    proposta: result.data,
  }, { status: 201 });
});
