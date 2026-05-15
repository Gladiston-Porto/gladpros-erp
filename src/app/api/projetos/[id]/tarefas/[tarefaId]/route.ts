import { NextRequest, NextResponse } from 'next/server'
import { ProjectTaskService } from '@/domains/projects/services/ProjectTaskService'
import { requireProjectChildAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { updateProjetoTarefaSchema, alterarStatusTarefaSchema } from '@/domains/projects/validators'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canRead')
    const { id: projectParam, tarefaId } = await context.params
    const projetoId = Number(projectParam)
    const id = Number(tarefaId)
    if (isNaN(projetoId) || isNaN(id)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectChildAccess(user, projetoId, 'tarefa', id, 'canRead')
    
    const service = new ProjectTaskService()
    const tarefa = await service.buscarPorId(id)
    if (!tarefa) return NextResponse.json({ error: 'Not found', message: 'Tarefa não encontrada', success: false }, { status: 404 })
    
    return NextResponse.json({ data: tarefa, success: true })
  });

export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageTasks')
    const { id: projectParam, tarefaId } = await context.params
    const projetoId = Number(projectParam)
    const id = Number(tarefaId)
    if (isNaN(projetoId) || isNaN(id)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectChildAccess(user, projetoId, 'tarefa', id, 'canManageTasks')
    
    const body = await request.json()
    const data = updateProjetoTarefaSchema.parse(body)
    
    const service = new ProjectTaskService()
    const tarefa = await service.atualizar(id, data, Number(user.id))
    return NextResponse.json({ data: tarefa, success: true })
  });

export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageTasks')
    const { id: projectParam, tarefaId } = await context.params
    const projetoId = Number(projectParam)
    const id = Number(tarefaId)
    if (isNaN(projetoId) || isNaN(id)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectChildAccess(user, projetoId, 'tarefa', id, 'canManageTasks')
    
    const service = new ProjectTaskService()
    await service.excluir(id, Number(user.id))
    return NextResponse.json({ data: null, message: 'Tarefa excluída com sucesso', success: true })
  });

export const PATCH = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; tarefaId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageTasks')
    const { id: projectParam, tarefaId } = await context.params
    const projetoId = Number(projectParam)
    const id = Number(tarefaId)
    if (isNaN(projetoId) || isNaN(id)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectChildAccess(user, projetoId, 'tarefa', id, 'canManageTasks')
    
    const body = await request.json()
    const data = alterarStatusTarefaSchema.parse(body)
    
    const service = new ProjectTaskService()
    const tarefa = await service.alterarStatus(id, data, Number(user.id))
    return NextResponse.json({ data: tarefa, success: true })
  });
