/**
 * GET  /api/projetos/[id]/financeiro/costs - Real cost breakdown from Expense + Timesheet
 * POST /api/projetos/[id]/financeiro/costs - Recalculate and persist custoReal to Projeto
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth';
import { prisma } from '@/lib/prisma';
import {
  getProjectFinanceSummary,
  syncProjectCosts,
} from '@/shared/lib/services/project-finance';

import { withErrorHandler } from '@/lib/api/error-handler';
export const GET = withErrorHandler(async (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const projetoId = parseInt(id);

    if (isNaN(projetoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const exists = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    const summary = await getProjectFinanceSummary(projetoId);

    return NextResponse.json({ success: true, data: summary });
});

export const POST = withErrorHandler(async (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const projetoId = parseInt(id);

    if (isNaN(projetoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const exists = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    const summary = await syncProjectCosts(projetoId);

    return NextResponse.json({
      success: true,
      message: 'Custos recalculados e persistidos',
      data: summary,
    });
});
