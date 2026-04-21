/**
 * GET  /api/projetos/[id]/financeiro/costs - Real cost breakdown from Expense + Timesheet
 * POST /api/projetos/[id]/financeiro/costs - Recalculate and persist custoReal to Projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectPermission } from '@/shared/lib/rbac-projects';
import { prisma } from '@/lib/prisma';
import {
  getProjectFinanceSummary,
  syncProjectCosts,
} from '@/shared/lib/services/project-finance';

import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    await requireProjectPermission(req, 'canViewFinancials');

    const { id } = await params;
    const projetoId = parseInt(id, 10);

    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      );
    }

    const exists = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { error: 'Projeto não encontrado', message: 'Nenhum projeto com este ID', success: false },
        { status: 404 }
      );
    }

    const summary = await getProjectFinanceSummary(projetoId);

    return NextResponse.json({ data: summary, success: true });
});

export const POST = withErrorHandler(async (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    await requireProjectPermission(req, 'canViewFinancials');

    const { id } = await params;
    const projetoId = parseInt(id, 10);

    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      );
    }

    const exists = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { error: 'Projeto não encontrado', message: 'Nenhum projeto com este ID', success: false },
        { status: 404 }
      );
    }

    const summary = await syncProjectCosts(projetoId);

    return NextResponse.json({
      data: summary,
      message: 'Custos recalculados e persistidos',
      success: true,
    });
});
