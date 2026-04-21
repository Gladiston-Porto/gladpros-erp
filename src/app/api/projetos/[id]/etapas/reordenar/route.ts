import { NextRequest, NextResponse } from 'next/server'
import { ProjectStageService } from '@/domains/projects/services/ProjectStageService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

// Schema para validar nova ordem
const reordenarEtapasSchema = z.object({
  novaOrdem: z.array(z.object({
    id: z.number().int().positive(),
    ordem: z.number().int().min(0)
  })).min(1)
})

/**
 * POST /api/projetos/[id]/etapas/reordenar - Reordenar etapas (drag-and-drop)
 */
export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageStages')
    
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { novaOrdem } = reordenarEtapasSchema.parse(body)
    
    const service = new ProjectStageService()
    await service.reordenar(projetoId, novaOrdem, Number(user.id))
    
    return NextResponse.json({ 
      message: 'Etapas reordenadas com sucesso',
      count: novaOrdem.length,
      success: true
    })
    
  });
