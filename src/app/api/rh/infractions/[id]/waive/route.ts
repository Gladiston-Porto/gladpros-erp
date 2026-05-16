/**
 * POST /api/rh/infractions/[id]/waive
 * ADMIN/GERENTE waives the financial penalty of an infraction.
 * The infraction record stays (for pattern tracking), only the penalty is waived.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import type { Role } from '@/shared/lib/rbac-core'

const schema = z.object({
  reason: z.string().min(1, 'Justificativa obrigatória').max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request)
  if (!can(user.role as Role, 'rh', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
  }

  const { id } = await params
  const infractionId = Number(id)
  if (isNaN(infractionId)) {
    return NextResponse.json({ error: 'Invalid ID', success: false }, { status: 400 })
  }

  const body = schema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message, success: false },
      { status: 400 }
    )
  }

  const infraction = await prisma.workerInfraction.findUnique({ where: { id: infractionId } })
  if (!infraction) {
    return NextResponse.json({ error: 'Not found', success: false }, { status: 404 })
  }

  if (infraction.waived) {
    return NextResponse.json(
      { error: 'Conflict', message: 'Infração já foi abonada', success: false },
      { status: 409 }
    )
  }

  const updated = await prisma.workerInfraction.update({
    where: { id: infractionId },
    data: {
      waived: true,
      waivedById: user.id,
      waivedAt: new Date(),
      waivedReason: body.data.reason,
    },
  })

  return NextResponse.json({ data: updated, success: true })
}
