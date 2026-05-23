/**
 * POST /api/rh/time-entries/[id]/reject
 * ADMIN/GERENTE rejects a submitted time entry with a reason.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import type { Role } from '@/shared/lib/rbac-core';

const schema = z.object({
  reason: z.string().min(1, 'Motivo obrigatório').max(500),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'rh', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  const { id } = await params;
  const entryId = Number(id);
  if (isNaN(entryId)) {
    return NextResponse.json({ error: 'Invalid ID', success: false }, { status: 400 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message, success: false },
      { status: 400 },
    );
  }

  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: 'Not found', success: false }, { status: 404 });
  }

  if (!['SUBMITTED', 'CORRECTION_PENDING'].includes(entry.status)) {
    return NextResponse.json(
      {
        error: 'Conflict',
        message: `Turno com status ${entry.status} não pode ser rejeitado`,
        success: false,
      },
      { status: 409 },
    );
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      status: 'REJECTED',
      rejectionReason: body.data.reason,
      approvedById: Number(user.id),
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ data: updated, success: true });
}
