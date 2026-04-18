import { NextRequest, NextResponse } from 'next/server'
import { ProjectAttachmentService } from '@/domains/projects/services/ProjectAttachmentService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { createProjetoAnexoSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    await requireProjectPermission(request, 'canRead')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const service = new ProjectAttachmentService()
    const anexos = await service.listarPorProjeto(projetoId)
    return NextResponse.json(anexos)
  });

export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canUploadAttachments')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const body = await request.json()
    const data = createProjetoAnexoSchema.parse({ ...body, projetoId })
    
    const service = new ProjectAttachmentService()
    const anexo = await service.criar(data, Number(user.id))
    return NextResponse.json(anexo, { status: 201 })
  });
