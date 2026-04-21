import { NextRequest, NextResponse } from 'next/server'
import { ProjectMaterialService } from '@/domains/projects/services/ProjectMaterialService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { updateProjetoMaterialSchema, alterarStatusMaterialSchema } from '@/domains/projects/validators'
import { ZodError } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; materialId: string }> }) => {
    await requireProjectPermission(request, 'canRead')
    const { materialId } = await context.params
    const id = Number(materialId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    
    const service = new ProjectMaterialService()
    const material = await service.buscarPorId(id)
    if (!material) return NextResponse.json({ error: 'Material não encontrado', message: 'Nenhum material com este ID', success: false }, { status: 404 })
    return NextResponse.json({ material, success: true })
  });

export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; materialId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageMaterials')
    const { materialId } = await context.params
    const id = Number(materialId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    
    const body = await request.json()
    const data = updateProjetoMaterialSchema.parse(body)
    
    const service = new ProjectMaterialService()
    const material = await service.atualizar(id, data, Number(user.id))
    return NextResponse.json({ material, success: true })
  });

export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; materialId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageMaterials')
    const { materialId } = await context.params
    const id = Number(materialId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    
    const service = new ProjectMaterialService()
    await service.excluir(id, Number(user.id))
    return NextResponse.json({ message: 'Material excluído com sucesso', success: true })
  });

export const PATCH = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string; materialId: string }> }) => {
    const user = await requireProjectPermission(request, 'canManageMaterials')
    const { materialId } = await context.params
    const id = Number(materialId)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    
    const body = await request.json()
    const data = alterarStatusMaterialSchema.parse(body)
    
    const service = new ProjectMaterialService()
    const material = await service.alterarStatus(id, data, Number(user.id))
    return NextResponse.json({ material, success: true })
  });
