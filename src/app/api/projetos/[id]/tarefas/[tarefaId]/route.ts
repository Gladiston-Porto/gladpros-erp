import { NextRequest, NextResponse } from 'next/server'
import { ProjectTaskService } from '@/domains/projects/services/ProjectTaskService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { updateProjetoTarefaSchema, alterarStatusTarefaSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    await requireProjectPermission(request, 'canRead')
    const { tarefaId } = await context.params
    const id = Number(tarefaId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const service = new ProjectTaskService()
    const tarefa = await service.buscarPorId(id)
    if (!tarefa) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    
    return NextResponse.json(tarefa)
  });

export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageTasks')
    const { tarefaId } = await context.params
    const id = Number(tarefaId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const body = await request.json()
    const data = updateProjetoTarefaSchema.parse(body)
    
    const service = new ProjectTaskService()
    const tarefa = await service.atualizar(id, data, Number(user.id))
    return NextResponse.json(tarefa)
  });

export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageTasks')
    const { tarefaId } = await context.params
    const id = Number(tarefaId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const service = new ProjectTaskService()
    await service.excluir(id, Number(user.id))
    return NextResponse.json({ message: 'Tarefa excluída com sucesso' })
  });

export const PATCH = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageTasks')
    const { tarefaId } = await context.params
    const id = Number(tarefaId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const body = await request.json()
    const data = alterarStatusTarefaSchema.parse(body)
    
    const service = new ProjectTaskService()
    const tarefa = await service.alterarStatus(id, data, Number(user.id))
    return NextResponse.json(tarefa)
  });
