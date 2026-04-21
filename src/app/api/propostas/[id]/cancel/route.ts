import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { cancelProposal } from '@/domains/proposals/services';
import { logger } from '@/lib/api/logger';

const cancelSchema = z.object({
  motivo: z.string().min(1, 'Motivo é obrigatório').max(500).optional(),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/propostas/[id]/cancel - Cancel proposta
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'propostas', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params
    const propostaId = parseInt(id)
    const parsed = cancelSchema.safeParse(await request.json().catch(() => ({})))
    const motivo = parsed.success ? parsed.data.motivo : undefined

    const result = await cancelProposal(propostaId, motivo, {
      actorId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    if (!result.success) {
      logger.error('[Propostas] Falha ao cancelar proposta', { url: request.url }, new Error(result.error))
      return NextResponse.json({ error: result.error, success: false }, { status: 422 })
    }

    return NextResponse.json({
      data: result.data,
      message: 'Proposta cancelada com sucesso',
      success: true,
    })
  });
