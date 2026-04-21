import { NextRequest, NextResponse } from 'next/server'
import { ProjectStageService } from '@/domains/projects/services/ProjectStageService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { updateProjetoEtapaSchema, alterarStatusEtapaSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos/[id]/etapas/[etapaId] - Obter detalhes de uma etapa
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; etapaId: string }> }) => {
    await requireProjectPermission(request, 'canRead')
    
    const { etapaId } = await context.params
    const id = Number(etapaId)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    const service = new ProjectStageService()
    const etapa = await service.buscarPorId(id)
    
    if (!etapa) {
      return NextResponse.json(
        { error: 'Etapa não encontrada', message: 'Nenhuma etapa com este ID', success: false },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ etapa, success: true })
    
  });

/**
 * PUT /api/projetos/[id]/etapas/[etapaId] - Atualizar etapa
 */
export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; etapaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageStages')
    
    const { etapaId } = await context.params
    const id = Number(etapaId)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    
    const body = await request.json()
    const data = updateProjetoEtapaSchema.parse(body)
    
    const service = new ProjectStageService()
    const etapa = await service.atualizar(id, data, Number(user.id))
    
    return NextResponse.json({ etapa, success: true })
    
  });

/**
 * DELETE /api/projetos/[id]/etapas/[etapaId] - Excluir etapa
 */
export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; etapaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageStages')
    
    const { etapaId } = await context.params
    const id = Number(etapaId)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    
    const service = new ProjectStageService()
    await service.excluir(id, Number(user.id))
    
    return NextResponse.json({ message: 'Etapa excluída com sucesso', success: true })
    
  });

/**
 * PATCH /api/projetos/[id]/etapas/[etapaId]/status - Alterar status da etapa
 */
export const PATCH = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; etapaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageStages')
    
    const { etapaId } = await context.params
    const id = Number(etapaId)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    
    const body = await request.json()
    const data = alterarStatusEtapaSchema.parse(body)
    
    const service = new ProjectStageService()
    const etapa = await service.alterarStatus(id, data, Number(user.id))
    
    return NextResponse.json({ etapa, success: true })
    
  });
