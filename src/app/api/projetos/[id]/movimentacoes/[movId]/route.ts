import { NextRequest, NextResponse } from 'next/server'
import { InventoryMovementService } from '@/domains/projects/services/inventory-movement.service'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos/[id]/movimentacoes/[movId]
 * Busca detalhes de uma movimentação específica
 * Requer permissão: canRead
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; movId: string }> }) => {
    // Verifica permissão de leitura
    await requireProjectPermission(request, 'canRead')
    
    // Extrai e valida parâmetros
    const { id: projetoIdStr, movId: movimentacaoIdStr } = await context.params
    const projetoId = Number(projetoIdStr)
    const movimentacaoId = Number(movimentacaoIdStr)
    
    if (isNaN(projetoId) || isNaN(movimentacaoId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      )
    }
    
    // Busca movimentação
    const service = new InventoryMovementService()
    const movimentacao = await service.buscarPorId(movimentacaoId, projetoId)
    
    if (!movimentacao) {
      return NextResponse.json(
        { error: 'Movimentação não encontrada' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(movimentacao)
    
  });
