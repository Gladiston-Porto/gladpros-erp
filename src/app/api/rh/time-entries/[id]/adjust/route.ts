/**
 * PATCH /api/rh/time-entries/[id]/adjust
 * ADMIN manually adjusts clockIn/clockOut times on any entry.
 * Used for AUTO_CLOSED entries where the estimate was wrong.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import type { Role } from '@/shared/lib/rbac-core'

const schema = z.object({
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request)
  if (!can(user.role as Role, 'rh', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 })
  }

  // Only ADMIN can manually adjust
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Somente ADMIN pode ajustar horários manualmente', success: false },
      { status: 403 }
    )
  }

  const { id } = await params
  const entryId = Number(id)
  if (isNaN(entryId)) {
    return NextResponse.json({ error: 'Invalid ID', success: false }, { status: 400 })
  }

  const body = schema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message, success: false },
      { status: 400 }
    )
  }

  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } })
  if (!entry) {
    return NextResponse.json({ error: 'Not found', success: false }, { status: 404 })
  }

  const newClockIn = body.data.clockIn ? new Date(body.data.clockIn) : entry.clockIn
  const newClockOut = body.data.clockOut ? new Date(body.data.clockOut) : entry.clockOut

  if (newClockOut && newClockOut <= newClockIn) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'clockOut deve ser posterior ao clockIn', success: false },
      { status: 400 }
    )
  }

  let totalMinutes = entry.totalMinutes
  let regularMinutes = entry.regularMinutes
  let overtimeMinutes = entry.overtimeMinutes

  if (newClockOut) {
    totalMinutes = Math.round((newClockOut.getTime() - newClockIn.getTime()) / 60000)
    regularMinutes = Math.min(totalMinutes, 8 * 60)
    overtimeMinutes = Math.max(0, totalMinutes - 8 * 60)
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      clockIn: newClockIn,
      clockOut: newClockOut,
      totalMinutes,
      regularMinutes,
      overtimeMinutes,
      source: 'MANUAL',
      notes: body.data.notes ?? entry.notes,
      status: 'APPROVED',
      approvedById: user.id,
      approvedAt: new Date(),
    },
  })

  return NextResponse.json({ data: updated, success: true })
}
