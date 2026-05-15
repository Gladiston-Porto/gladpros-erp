import { NextRequest, NextResponse } from 'next/server'
import { ProjectStageService } from '@/domains/projects/services/ProjectStageService'
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { createProjetoEtapaSchema } from '@/domains/projects/validators'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

/**
 * GET /api/projetos/[id]/etapas - Listar etapas de um projeto
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    // Verificar permissão de leitura
    const user = await requireProjectPermission(request, 'canRead')
    
    // Validar ID do projeto
    const { id } = await context.params
    const projetoId = Number(id)
    
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'ID inválido', message: 'O ID do projeto deve ser um número válido', success: false },
        { status: 400 }
      )
    }
    await requireProjectAccess(user, projetoId, 'canRead')
    const query = listQuerySchema.safeParse({
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      pageSize: request.nextUrl.searchParams.get('pageSize') ?? undefined,
    })
    if (!query.success) {
      return NextResponse.json({ error: 'Validation failed', message: query.error.issues[0]?.message ?? 'Parâmetros inválidos', success: false }, { status: 400 })
    }
    const { page, pageSize } = query.data
    
    // Listar etapas
    const service = new ProjectStageService()
    const [total, etapas] = await Promise.all([
      prisma.projetoEtapa.count({ where: { projetoId } }),
      service.listarPorProjeto(projetoId, { page, pageSize }),
    ])
    
    return NextResponse.json({
      data: etapas,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      success: true,
    })
    
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
    await requireProjectAccess(user, projetoId, 'canManageStages')
    
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
    
    return NextResponse.json({ data: etapa, success: true }, { status: 201 })
    
  });
