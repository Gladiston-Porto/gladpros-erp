import { NextRequest, NextResponse } from 'next/server'
import { requireProjectChildAccess, requireProjectPermission } from '@/shared/lib/rbac-projects'
import { withErrorHandler } from '@/lib/api/error-handler'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'

const checklistItemSchema = z.object({
  id: z.string().min(1),
  texto: z.string().min(1).max(500),
  concluido: z.boolean(),
})

const putChecklistSchema = z.object({
  itens: z.array(checklistItemSchema).max(100),
})

/**
 * GET /api/projetos/[id]/etapas/[etapaId]/checklist
 * Retorna os itens de checklist de uma etapa
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string; etapaId: string }> }
) => {
  const user = await requireProjectPermission(request, 'canRead')

  const { id: projectParam, etapaId } = await context.params
  const projetoId = Number(projectParam)
  const id = Number(etapaId)
  if (isNaN(projetoId) || isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 })
  }
  await requireProjectChildAccess(user, projetoId, 'etapa', id, 'canRead')

  const etapa = await prisma.projetoEtapa.findFirst({
    where: { id, projetoId },
    select: { id: true, checklistItens: true },
  })

  if (!etapa) {
    return NextResponse.json({ error: 'Etapa não encontrada', success: false }, { status: 404 })
  }

  const itens = Array.isArray(etapa.checklistItens) ? etapa.checklistItens : []
  return NextResponse.json({ data: itens, success: true })
})

/**
 * PUT /api/projetos/[id]/etapas/[etapaId]/checklist
 * Salva (substituindo) os itens de checklist de uma etapa
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string; etapaId: string }> }
) => {
  const user = await requireProjectPermission(request, 'canManageStages')

  const { id: projectParam, etapaId } = await context.params
  const projetoId = Number(projectParam)
  const id = Number(etapaId)
  if (isNaN(projetoId) || isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 })
  }
  await requireProjectChildAccess(user, projetoId, 'etapa', id, 'canManageStages')

  const body = await request.json()
  const parsed = putChecklistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', message: parsed.error.issues[0]?.message, success: false },
      { status: 400 }
    )
  }

  const etapa = await prisma.projetoEtapa.findFirst({ where: { id, projetoId } })
  if (!etapa) {
    return NextResponse.json({ error: 'Etapa não encontrada', success: false }, { status: 404 })
  }

  const updated = await prisma.projetoEtapa.update({
    where: { id },
    data: { checklistItens: parsed.data.itens },
    select: { id: true, checklistItens: true },
  })

  return NextResponse.json({ data: updated.checklistItens, success: true })
})
