import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { can, type Role } from '@/shared/lib/rbac-core';
import { withErrorHandler } from '@/lib/api/error-handler';
import {
  listProjectHealthAlerts,
  syncProjectHealthAlerts,
} from '@/domains/projects/services/project-health-alert.service';

const statusSchema = z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']).optional();

function parseProjetoId(id: string) {
  const projetoId = Number.parseInt(id, 10);
  return Number.isNaN(projetoId) ? null : projetoId;
}

export const GET = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');
  const { id } = await context.params;
  const projetoId = parseProjetoId(id);
  if (!projetoId) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 }
    );
  }

  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  const url = new URL(req.url);
  const status = statusSchema.safeParse(url.searchParams.get('status') ?? undefined);
  if (!status.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Status de alerta inválido', success: false },
      { status: 400 }
    );
  }

  const alerts = await listProjectHealthAlerts(projetoId, { status: status.data });
  return NextResponse.json({ data: alerts, success: true });
});

export const POST = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');
  if (!can(user.role as Role, 'financeiro', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para sincronizar alertas', success: false },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const projetoId = parseProjetoId(id);
  if (!projetoId) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 }
    );
  }

  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  const result = await syncProjectHealthAlerts(projetoId, { userId: Number(user.id) });
  if (!result) {
    return NextResponse.json(
      { error: 'Not found', message: 'Projeto não encontrado', success: false },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      created: result.created,
      updated: result.updated,
      activeAlerts: result.activeAlerts,
      snapshot: result.snapshot,
    },
    success: true,
  });
});
