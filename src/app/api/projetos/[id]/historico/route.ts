import { NextRequest, NextResponse } from 'next/server'
import { ProjectHistoryService } from '@/domains/projects/services/ProjectHistoryService'
import { requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    await requireProjectPermission(request, 'canViewHistory')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    
    // Obter parâmetros de paginação
    const { searchParams } = new URL(request.url)
    const pagina = Number(searchParams.get('pagina')) || 1
    const limite = Number(searchParams.get('limite')) || 20
    
    const service = new ProjectHistoryService()
    const historico = await service.listar(projetoId, { projetoId, pagina, limite })
    return NextResponse.json({ ...historico, success: true })
  });
