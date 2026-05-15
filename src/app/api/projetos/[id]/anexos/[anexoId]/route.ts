import { NextRequest, NextResponse } from 'next/server'
import { ProjectAttachmentService } from '@/domains/projects/services/ProjectAttachmentService'
import { requireProjectChildAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; anexoId: string }> }) => {
    const user = await requireProjectPermission(request, 'canDownloadAttachments')
    const { id: projectParam, anexoId } = await context.params
    const projetoId = Number(projectParam)
    const id = Number(anexoId)
    if (isNaN(projetoId) || isNaN(id)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectChildAccess(user, projetoId, 'anexo', id, 'canDownloadAttachments')
    
    const service = new ProjectAttachmentService()
    const anexo = await service.buscarPorId(id)
    if (!anexo) return NextResponse.json({ error: 'Not found', message: 'Anexo não encontrado', success: false }, { status: 404 })
    return NextResponse.json({ data: anexo, success: true })
  });

export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; anexoId: string }> }) => {
    const user = await requireProjectPermission(request, 'canDeleteAttachments')
    const { id: projectParam, anexoId } = await context.params
    const projetoId = Number(projectParam)
    const id = Number(anexoId)
    if (isNaN(projetoId) || isNaN(id)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectChildAccess(user, projetoId, 'anexo', id, 'canDeleteAttachments')
    
    const service = new ProjectAttachmentService()
    await service.excluir(id, Number(user.id))
    return NextResponse.json({ data: null, message: 'Anexo excluído com sucesso', success: true })
  });
