import { NextRequest, NextResponse } from 'next/server'
import { ProjectAttachmentService } from '@/domains/projects/services/ProjectAttachmentService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; anexoId: string }> }) => {
    await requireProjectPermission(request, 'canDownloadAttachments')
    const { anexoId } = await context.params
    const id = Number(anexoId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const service = new ProjectAttachmentService()
    const anexo = await service.buscarPorId(id)
    if (!anexo) return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
    return NextResponse.json(anexo)
  });

export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; anexoId: string }> }) => {
    const user = await requireProjectPermission(request, 'canDeleteAttachments')
    const { anexoId } = await context.params
    const id = Number(anexoId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const service = new ProjectAttachmentService()
    await service.excluir(id, Number(user.id))
    return NextResponse.json({ message: 'Anexo excluído com sucesso' })
  });
