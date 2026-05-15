import { NextRequest, NextResponse } from 'next/server'
import { InventoryMovementService } from '@/domains/projects/services/inventory-movement.service'
import { requireProjectChildAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

// Schema de validação para liberação de material
const liberarMaterialSchema = z.object({
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  observacao: z.string().optional(),
})

/**
 * POST /api/projetos/[id]/materiais/[materialId]/liberar
 * Libera material do estoque para o projeto
 * Requer permissão: canManageMaterials
 */
export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; materialId: string }> }) => {
    // Verifica permissão de gestão de materiais
    const user = await requireProjectPermission(request, 'canManageMaterials')
    
    // Extrai e valida parâmetros
    const { id: projetoIdStr, materialId: materialIdStr } = await context.params
    const projetoId = Number(projetoIdStr)
    const materialId = Number(materialIdStr)
    
    if (isNaN(projetoId) || isNaN(materialId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'IDs inválidos', success: false },
        { status: 400 }
      )
    }
    await requireProjectChildAccess(user, projetoId, 'material', materialId, 'canManageMaterials')
    
    // Valida corpo da requisição
    const body = await request.json()
    const { quantidade, observacao } = liberarMaterialSchema.parse(body)
    
    // Executa liberação
    const service = new InventoryMovementService()
    const movimentacao = await service.liberarMaterial({
      projetoId,
      materialId,
      quantidade,
      usuarioId: Number(user.id),
      observacao,
    })
    
    return NextResponse.json({ data: movimentacao, success: true }, { status: 201 })
    
  });
