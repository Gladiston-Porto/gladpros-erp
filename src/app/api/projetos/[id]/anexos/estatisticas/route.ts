import { NextRequest, NextResponse } from 'next/server'
import { ProjectAttachmentService } from '@/domains/projects/services/ProjectAttachmentService'
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = "nodejs"

export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireProjectPermission(request, 'canRead')
    const { id } = await context.params
    const projetoId = Number(id)
    if (isNaN(projetoId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 }
      )
    }
    await requireProjectAccess(user, projetoId, 'canRead')

    const service = new ProjectAttachmentService()
    const estatisticas = await service.obterEstatisticas(projetoId)
    return NextResponse.json({ data: estatisticas, success: true })
  });
