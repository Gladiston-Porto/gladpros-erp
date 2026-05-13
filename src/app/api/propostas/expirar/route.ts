import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import type { Role } from '@/shared/lib/rbac-core'

/**
 * POST /api/propostas/expirar
 * Cancels all ENVIADA proposals whose validadeProposta has passed.
 * Can be triggered manually (ADMIN/GERENTE) or by a cron job (no auth header → bearer token).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  let actorId: number | null = null

  if (authHeader?.startsWith('Bearer ')) {
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Configuration error', message: 'CRON_SECRET não configurado', success: false },
        { status: 500 }
      )
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Token de cron inválido', success: false }, { status: 401 })
    }
  } else {
    const user = await requireUser(request)
    if (!can(user.role as Role, 'propostas', 'update')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
    }
    actorId = parseInt(user.id) || null
  }

  const now = new Date()

  // Find expired ENVIADA proposals
  const expired = await prisma.proposta.findMany({
    where: {
      status: 'ENVIADA',
      validadeProposta: { lt: now },
    },
    select: { id: true, numeroProposta: true, validadeProposta: true },
  })

  if (expired.length === 0) {
    return NextResponse.json({ data: { expiredCount: 0, proposals: [] }, success: true })
  }

  const expiredIds = expired.map((p) => p.id)

  // Cancel in bulk + create audit logs in a transaction
  await prisma.$transaction([
    prisma.proposta.updateMany({
      where: { id: { in: expiredIds } },
      data: {
        status: 'CANCELADA',
        atualizadoEm: now,
      },
    }),
    ...expired.map((p) =>
      prisma.propostaLog.create({
        data: {
          id: randomUUID(),
          propostaId: p.id,
            actorId,
          action: 'CANCELLED',
          newJson: JSON.stringify({
            motivo: 'Expirada automaticamente',
            validadeProposta: p.validadeProposta?.toISOString().split('T')[0],
            statusAnterior: 'ENVIADA',
            statusNovo: 'CANCELADA',
          }),
        },
      })
    ),
  ])

  return NextResponse.json({
    data: {
      expiredCount: expired.length,
      proposals: expired.map((p) => ({
        id: p.id,
        numeroProposta: p.numeroProposta,
        validadeProposta: p.validadeProposta,
      })),
    },
    success: true,
  })
}
