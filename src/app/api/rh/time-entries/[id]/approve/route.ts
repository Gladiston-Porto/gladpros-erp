/**
 * POST /api/rh/time-entries/[id]/approve
 * ADMIN/GERENTE approves a submitted or auto-closed time entry.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import type { Role } from '@/shared/lib/rbac-core';

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

  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: 'Not found', success: false }, { status: 404 });
  }

  const approvableStatuses = ['SUBMITTED', 'AUTO_CLOSED', 'CORRECTION_PENDING'];
  if (!approvableStatuses.includes(entry.status)) {
    return NextResponse.json(
      {
        error: 'Conflict',
        message: `Turno com status ${entry.status} não pode ser aprovado`,
        success: false,
      },
      { status: 409 },
    );
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      status: 'APPROVED',
      approvedById: Number(user.id),
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ data: updated, success: true });
}
