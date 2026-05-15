import { NextRequest, NextResponse } from 'next/server'
import { InventoryMovementService } from '@/domains/projects/services/inventory-movement.service'
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
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
    const user = await requireProjectPermission(request, 'canRead')

    // Extrai e valida parâmetros
    const { id: projetoIdStr, movId: movimentacaoIdStr } = await context.params
    const projetoId = Number(projetoIdStr)
    const movimentacaoId = Number(movimentacaoIdStr)

    if (isNaN(projetoId) || isNaN(movimentacaoId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'IDs inválidos', success: false },
        { status: 400 }
      )
    }
    await requireProjectAccess(user, projetoId, 'canRead')

    // Busca movimentação
    const service = new InventoryMovementService()
    const movimentacao = await service.buscarPorId(movimentacaoId, projetoId)

    if (!movimentacao) {
      return NextResponse.json(
        { error: 'Not found', message: 'Movimentação não encontrada', success: false },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: movimentacao, success: true })

  });
