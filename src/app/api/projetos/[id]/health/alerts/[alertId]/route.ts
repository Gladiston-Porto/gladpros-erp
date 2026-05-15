import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { withErrorHandler } from '@/lib/api/error-handler';
import { updateProjectHealthAlertStatus } from '@/domains/projects/services/project-health-alert.service';
import { can, type Role } from '@/shared/lib/rbac-core';

const bodySchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'RESOLVED']),
});

function parseId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

export const PATCH = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string; alertId: string }> }
) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');
  const { id, alertId } = await context.params;
  const projetoId = parseId(id);
  const parsedAlertId = parseId(alertId);

  if (!projetoId || !parsedAlertId) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID inválido', success: false },
      { status: 400 }
    );
  }

  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  if (!can(user.role as Role, 'financeiro', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para alterar status de alerta financeiro', success: false },
      { status: 403 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    );
  }

  const result = await updateProjectHealthAlertStatus(
    projetoId,
    parsedAlertId,
    parsed.data.status,
    Number(user.id)
  );

  if (result.count === 0) {
    return NextResponse.json(
      { error: 'Not found', message: 'Alerta não encontrado para este projeto', success: false },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { updated: result.count }, success: true });
});
