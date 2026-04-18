import { NextRequest, NextResponse } from 'next/server'
import { ProjectTaskService } from '@/domains/projects/services/ProjectTaskService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { createProjetoTarefaSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

/**
 * GET /api/projetos/[id]/tarefas - Listar tarefas de um projeto
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    await requireProjectPermission(request, 'canRead')
    
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    
    const service = new ProjectTaskService()
    const tarefas = await service.listarPorProjeto(projetoId)
    
    return NextResponse.json({ tarefas })
    
  });

/**
 * POST /api/projetos/[id]/tarefas - Criar nova tarefa
 */
export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageTasks')
    
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    
    const body = await request.json()
    const data = createProjetoTarefaSchema.parse({
      ...body,
      projetoId
    })
    
    const service = new ProjectTaskService()
    const tarefa = await service.criar(data, Number(user.id))
    
    return NextResponse.json(tarefa, { status: 201 })
    
  });
