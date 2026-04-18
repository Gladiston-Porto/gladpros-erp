/**
 * GET /api/projetos/[id]/financeiro/resumo
 * Fase 7: Obtém resumo financeiro do projeto
 * 
 * @middleware requireProjectPermission - Requer canViewFinancials
 * @returns Resumo financeiro com valores mascarados conforme role
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectPermission, shouldMaskFinancials } from '@/shared/lib/rbac-projects';
import { getFinanceGateway } from '@/domains/projects/gateways/mock-finance.gateway';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';

export const GET = withErrorHandler(async (req: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão de visualização financeira
    const user = await requireProjectPermission(req, 'canViewFinancials');
    
    // Validar ID
    const { id } = await context.params;
    const projetoId = parseInt(id, 10);

    if (isNaN(projetoId)) {
      return NextResponse.json(
        { erro: 'ID do projeto inválido' },
        { status: 400 }
      );
    }

    // Busca projeto
    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { id: true },
    });

    if (!projeto) {
      return NextResponse.json(
        { erro: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Chama gateway financeiro
    const gateway = getFinanceGateway();
    const resumo = await gateway.obterResumoFinanceiro(projetoId);

    // Verifica se deve mascarar valores financeiros
    const deveMascarar = shouldMaskFinancials(user.role);

    // Monta resposta (com ou sem mascaramento)
    if (deveMascarar) {
      // Usuário ESTOQUE e USUARIO veem versão reduzida
      return NextResponse.json({
        sucesso: true,
        resumo: {
          projetoId: resumo.projetoId,
          numeroProjeto: resumo.numeroProjeto,
          status: 'Disponível', // Apenas status genérico
          totalInvoices: resumo.totalInvoices,
          atualizadoEm: resumo.atualizadoEm,
        },
      });
    }

    // ADMIN, GERENTE, FINANCEIRO veem valores completos
    return NextResponse.json({
      sucesso: true,
      resumo: {
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
    });
  });
