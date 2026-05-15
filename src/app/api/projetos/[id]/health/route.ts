import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { withErrorHandler } from '@/lib/api/error-handler';
import { getProjectHealthSnapshot } from '@/domains/projects/services/project-health.service';

export const GET = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');

  const { id } = await context.params;
  const projetoId = Number.parseInt(id, 10);
  if (Number.isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 }
    );
  }

  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  const snapshot = await getProjectHealthSnapshot(projetoId);
  if (!snapshot) {
    return NextResponse.json(
      { error: 'Not found', message: 'Projeto não encontrado', success: false },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: snapshot, success: true });
});
