/**
 * GET /api/projetos/[id]/financeiro/resumo
 * Obtém resumo financeiro do projeto via gateway (Prisma em produção, mock em testes).
 *
 * Requer canViewFinancials. Valores financeiros mascarados por role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, requireProjectPermission, shouldMaskFinancials } from '@/shared/lib/rbac-projects';
import { getFinanceGateway } from '@/domains/projects/gateways';
import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (req: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');

  const { id } = await context.params;
  const projetoId = parseInt(id, 10);

  if (isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 },
    );
  }
  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  const gateway = getFinanceGateway();
  const resumo = await gateway.obterResumoFinanceiro(projetoId);

  // `obterResumoFinanceiro` retorna objeto vazio-ish se não encontrado — verificar
  if (!resumo.numeroProjeto) {
    return NextResponse.json(
      { error: 'Not found', message: 'Projeto não encontrado', success: false },
      { status: 404 },
    );
  }

  const deveMascarar = shouldMaskFinancials(user.role);

  if (deveMascarar) {
    return NextResponse.json({
      data: {
        projetoId: resumo.projetoId,
        numeroProjeto: resumo.numeroProjeto,
        totalInvoices: resumo.totalInvoices,
        atualizadoEm: resumo.atualizadoEm,
      },
      success: true,
    });
  }

  return NextResponse.json({
    data: {
      projetoId: resumo.projetoId,
      numeroProjeto: resumo.numeroProjeto,
      valorOrcado: resumo.valorOrcado,
      valorMateriais: resumo.valorMateriais,
      valorFaturado: resumo.valorFaturado,
      valorPago: resumo.valorPago,
      valorPendente: resumo.valorPendente,
      totalInvoices: resumo.totalInvoices,
      invoicesPendentes: resumo.invoicesPendentes,
      invoicesPagos: resumo.invoicesPagos,
      invoicesVencidos: resumo.invoicesVencidos,
      margem: resumo.margem,
      percentualMargem: Number(resumo.percentualMargem.toFixed(2)),
      atualizadoEm: resumo.atualizadoEm,
    },
    success: true,
  });
});
