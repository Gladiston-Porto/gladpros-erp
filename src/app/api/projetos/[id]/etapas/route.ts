import { NextRequest, NextResponse } from 'next/server'
import { ProjectStageService } from '@/domains/projects/services/ProjectStageService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { createProjetoEtapaSchema } from '@/domains/projects/validators'
import {  } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos/[id]/etapas - Listar etapas de um projeto
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão de leitura
    await requireProjectPermission(request, 'canRead')
    
    // Validar ID do projeto
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      )
    }
    
    // Listar etapas
    const service = new ProjectStageService()
    const etapas = await service.listarPorProjeto(projetoId)
    
    return NextResponse.json({ etapas, success: true })
    
  });

/**
 * POST /api/projetos/[id]/etapas - Criar nova etapa
 */
export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão para gerenciar etapas
    const user = await requireProjectPermission(request, 'canManageStages')
    
    // Validar ID do projeto
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      )
    }
    
    // Parsear body
    const body = await request.json()
    
    // Validar dados de entrada
    const data = createProjetoEtapaSchema.parse({
      ...body,
      projetoId
    })
    
    // Criar etapa
    const service = new ProjectStageService()
    const etapa = await service.criar(data, Number(user.id))
    
    return NextResponse.json({ etapa, success: true }, { status: 201 })
    
  });
