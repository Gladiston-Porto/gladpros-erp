import { NextRequest, NextResponse } from 'next/server'
import { ProjectAttachmentService } from '@/domains/projects/services/ProjectAttachmentService'
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { createProjetoAnexoSchema } from '@/domains/projects/validators'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canRead')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectAccess(user, projetoId, 'canRead')
    const query = listQuerySchema.safeParse({
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      pageSize: request.nextUrl.searchParams.get('pageSize') ?? undefined,
    })
    if (!query.success) {
      return NextResponse.json({ error: 'Validation failed', message: query.error.issues[0]?.message ?? 'Parâmetros inválidos', success: false }, { status: 400 })
    }
    const { page, pageSize } = query.data
    
    const service = new ProjectAttachmentService()
    const [total, anexos] = await Promise.all([
      prisma.projetoAnexo.count({ where: { projetoId } }),
      service.listarPorProjeto(projetoId, { page, pageSize }),
    ])
    return NextResponse.json({
      data: anexos,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      success: true,
    })
  });

export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canUploadAttachments')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 })
    await requireProjectAccess(user, projetoId, 'canUploadAttachments')
    
    const body = await request.json()
    const data = createProjetoAnexoSchema.parse({ ...body, projetoId })
    
    const service = new ProjectAttachmentService()
    const anexo = await service.criar(data, Number(user.id))
    return NextResponse.json({ data: anexo, success: true }, { status: 201 })
  });
