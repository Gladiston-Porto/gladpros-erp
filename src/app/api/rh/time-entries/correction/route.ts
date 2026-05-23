/**
 * POST /api/rh/time-entries/correction
 * Worker requests a retroactive time entry (forgot to clock in).
 * Creates a CORRECTION_PENDING entry for ADMIN/GERENTE to approve.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';

const schema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  clockIn: z.string().datetime('clockIn inválido'),
  clockOut: z.string().datetime('clockOut inválido'),
  reason: z.string().min(1, 'Justificativa obrigatória').max(500),
  workLocation: z.enum(['PROJECT_SITE', 'REMOTE', 'CLIENT_SITE']).optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser(request);

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message, success: false },
      { status: 400 },
    );
  }

  // Find worker linked to this user
  const worker = await prisma.worker.findFirst({
    where: { usuarioId: Number(user.id), deletadoEm: null },
  });
  if (!worker) {
    return NextResponse.json(
      { error: 'Not found', message: 'Usuário sem Worker vinculado', success: false },
      { status: 404 },
    );
  }

  const clockIn = new Date(body.data.clockIn);
  const clockOut = new Date(body.data.clockOut);

  if (clockOut <= clockIn) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: 'clockOut deve ser posterior ao clockIn',
        success: false,
      },
      { status: 400 },
    );
  }

  // Prevent duplicate correction for same day
  const workDate = new Date(body.data.workDate);
  const existing = await prisma.timeEntry.findFirst({
    where: {
      workerId: worker.id,
      workDate,
      status: { not: 'REJECTED' },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Conflict', message: 'Já existe um registro para essa data', success: false },
      { status: 409 },
    );
  }

  const totalMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);
  const regularMinutes = Math.min(totalMinutes, 8 * 60);
  const overtimeMinutes = Math.max(0, totalMinutes - 8 * 60);

  const entry = await prisma.timeEntry.create({
    data: {
      workerId: worker.id,
      clockIn,
      clockOut,
      workDate,
      workLocation: body.data.workLocation ?? 'PROJECT_SITE',
      totalMinutes,
      regularMinutes,
      overtimeMinutes,
      status: 'CORRECTION_PENDING',
      source: 'CORRECTION',
      correctionReason: body.data.reason,
    },
  });

  return NextResponse.json({ data: entry, success: true }, { status: 201 });
}
