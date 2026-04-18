import { NextRequest, NextResponse } from 'next/server'
import { ProjectMaterialService } from '@/domains/projects/services/ProjectMaterialService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { createProjetoMaterialSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    await requireProjectPermission(request, 'canManageMaterials')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const service = new ProjectMaterialService()
    const materiais = await service.listarPorProjeto(projetoId)
    return NextResponse.json({ materiais })
  });

export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageMaterials')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const body = await request.json()
    const data = createProjetoMaterialSchema.parse({ ...body, projetoId })
    
    const service = new ProjectMaterialService()
    const material = await service.criar(data, Number(user.id))
    return NextResponse.json(material, { status: 201 })
  });
