/**
 * GET  /api/projetos/[id]/financeiro/costs - Real cost breakdown from Expense + Timesheet
 * POST /api/projetos/[id]/financeiro/costs - Recalculate and persist custoReal to Projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { can, type Role } from '@/shared/lib/rbac-core';
import {
  getProjectFinanceSummary,
  syncProjectCosts,
} from '@/shared/lib/services/project-finance';

import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(req, 'canViewFinancials');

    const { id } = await params;
    const projetoId = parseInt(id, 10);

    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      );
    }

    await requireProjectAccess(user, projetoId, 'canViewFinancials');

    const summary = await getProjectFinanceSummary(projetoId);
    if (!summary) {
      return NextResponse.json(
        { error: 'Not found', message: 'Projeto não encontrado', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: summary, success: true });
});

export const POST = withErrorHandler(async (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(req, 'canViewFinancials');

    const { id } = await params;
    const projetoId = parseInt(id, 10);

    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      );
    }

    await requireProjectAccess(user, projetoId, 'canViewFinancials');

    if (!can(user.role as Role, 'financeiro', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para recalcular e persistir custos', success: false },
        { status: 403 }
      );
    }

    const summary = await syncProjectCosts(projetoId);
    if (!summary) {
      return NextResponse.json(
        { error: 'Not found', message: 'Projeto não encontrado', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: summary,
      message: 'Custos recalculados e persistidos',
      success: true,
    });
});
