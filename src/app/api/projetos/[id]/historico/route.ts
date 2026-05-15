import { NextRequest, NextResponse } from 'next/server'
import { ProjectHistoryService } from '@/domains/projects/services/ProjectHistoryService'
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

const listQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
})

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canViewHistory')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) return NextResponse.json({ error: 'ID inválido', message: 'O ID deve ser um número válido', success: false }, { status: 400 })
    await requireProjectAccess(user, projetoId, 'canViewHistory')
    
    // Obter parâmetros de paginação
    const { searchParams } = new URL(request.url)
    const query = listQuerySchema.safeParse({
      pagina: searchParams.get('pagina') ?? undefined,
      limite: searchParams.get('limite') ?? undefined,
    })
    if (!query.success) {
      return NextResponse.json({ error: 'Validation failed', message: query.error.issues[0]?.message ?? 'Parâmetros inválidos', success: false }, { status: 400 })
    }
    const { pagina, limite } = query.data
    
    const service = new ProjectHistoryService()
    const historico = await service.listar(projetoId, { projetoId, pagina, limite })
    return NextResponse.json({ ...historico, success: true })
  });
