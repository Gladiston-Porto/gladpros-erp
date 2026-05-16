/**
 * GET /api/rh/infractions
 * List worker infractions. ADMIN/GERENTE see all, USUARIO sees own.
 *
 * Query params:
 * - workerId?: number (ADMIN/GERENTE only)
 * - page?: number (default 1)
 * - pageSize?: number (default 20)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import type { Role } from '@/shared/lib/rbac-core'

export async function GET(request: NextRequest) {
  const user = await requireUser(request)
  if (!can(user.role as Role, 'rh', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? '20')))
  const workerIdParam = url.searchParams.get('workerId')

  const isManager = user.role === 'ADMIN' || user.role === 'GERENTE'

  let workerIdFilter: number | undefined

  if (workerIdParam) {
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 })
    }
    workerIdFilter = Number(workerIdParam)
  } else if (!isManager) {
    // Non-managers can only see their own
    const ownWorker = await prisma.worker.findFirst({
      where: { usuarioId: user.id },
      select: { id: true },
    })
    workerIdFilter = ownWorker?.id
  }

  const where = {
    empresaId: user.empresaId,
    ...(workerIdFilter !== undefined ? { workerId: workerIdFilter } : {}),
  }

  const [total, data] = await Promise.all([
    prisma.workerInfraction.count({ where }),
    prisma.workerInfraction.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true, usuario: { select: { nomeCompleto: true } } } },
        waivedBy: { select: { id: true, nomeCompleto: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ])

  return NextResponse.json({
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    success: true,
  })
}
