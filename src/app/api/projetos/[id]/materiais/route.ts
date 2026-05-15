import { NextRequest, NextResponse } from 'next/server'
import { ProjectMaterialService } from '@/domains/projects/services/ProjectMaterialService'
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { createProjetoMaterialSchema } from '@/domains/projects/validators'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler'
import { apiRateLimit } from '@/shared/lib/rate-limit'

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
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    await requireProjectAccess(user, projetoId, 'canRead')
    const query = listQuerySchema.safeParse({
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      pageSize: request.nextUrl.searchParams.get('pageSize') ?? undefined,
    })
    if (!query.success) {
      return NextResponse.json({ error: 'Validation failed', message: query.error.issues[0]?.message ?? 'Parâmetros inválidos', success: false }, { status: 400 })
    }
    const { page, pageSize } = query.data
    const service = new ProjectMaterialService()
    const [total, materiais] = await Promise.all([
      prisma.projetoMaterial.count({ where: { projetoId } }),
      service.listarPorProjeto(projetoId, { page, pageSize }),
    ])
    return NextResponse.json({
      data: materiais,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      success: true,
    })
  })

export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageMaterials')

    const rateCheck = await apiRateLimit.isAllowed(request)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      )
    }
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    await requireProjectAccess(user, projetoId, 'canManageMaterials')
    const body = await request.json()
    const data = createProjetoMaterialSchema.parse({ ...body, projetoId })
    const service = new ProjectMaterialService()
    const material = await service.criar(data, Number(user.id))
    return NextResponse.json({ data: material, success: true }, { status: 201 })
  })
