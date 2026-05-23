// src/app/api/rh/payroll/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const calculateSchema = z.object({
  periodId: z.number().int().positive(),
});

/**
 * POST /api/rh/payroll/calculate
 * Calculate (or recalculate) payroll entries for a period.
 * ADMIN only.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser(request);

  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Apenas ADMIN pode calcular payroll', success: false },
      { status: 403 },
    );
  }

  const body = calculateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: body.error.issues[0]?.message ?? 'Dados inválidos',
        success: false,
      },
      { status: 400 },
    );
  }

  const { periodId } = body.data;

  // 1. Find the period — must be OPEN and belong to this empresa
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, empresaId: user.empresaId },
    select: { id: true, status: true, startDate: true, endDate: true },
  });

  if (!period) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Período não encontrado', success: false },
      { status: 404 },
    );
  }

  if (period.status !== 'OPEN') {
    return NextResponse.json(
      { error: 'Conflict', message: 'Apenas períodos OPEN podem ser calculados', success: false },
      { status: 409 },
    );
  }

  // 2. Fetch all APPROVED time entries in the date range
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      status: 'APPROVED',
      workDate: { gte: period.startDate, lte: period.endDate },
    },
    select: {
      workerId: true,
      regularMinutes: true,
      overtimeMinutes: true,
    },
  });

  // 3. Group by workerId
  const byWorker = new Map<number, { regularMinutes: number; overtimeMinutes: number }>();

  for (const entry of timeEntries) {
    const existing = byWorker.get(entry.workerId) ?? { regularMinutes: 0, overtimeMinutes: 0 };
    byWorker.set(entry.workerId, {
      regularMinutes: existing.regularMinutes + (entry.regularMinutes ?? 0),
      overtimeMinutes: existing.overtimeMinutes + (entry.overtimeMinutes ?? 0),
    });
  }

  if (byWorker.size === 0) {
    return NextResponse.json({
      data: {
        periodId,
        entriesCreated: 0,
        entriesUpdated: 0,
        totalGrossPay: 0,
        workersWithMissingRate: [],
      },
      success: true,
    });
  }

  // 4. Fetch workers
  const workerIds = Array.from(byWorker.keys());
  const workers = await prisma.worker.findMany({
    where: { id: { in: workerIds }, deletadoEm: null },
    select: { id: true, name: true, defaultHourlyRate: true },
  });

  const workerMap = new Map(workers.map((w) => [w.id, w]));

  // 5. Fetch non-waived penalties for these workers in the period range
  const infractions = await prisma.workerInfraction.findMany({
    where: {
      workerId: { in: workerIds },
      penaltyApplied: true,
      waived: false,
      waivedAt: null,
      occurredAt: { gte: period.startDate, lte: period.endDate },
    },
    select: { id: true, workerId: true, penaltyAmount: true },
  });

  // Group penalties by workerId
  const penaltiesByWorker = new Map<number, { ids: number[]; total: number }>();
  for (const inf of infractions) {
    const existing = penaltiesByWorker.get(inf.workerId) ?? { ids: [], total: 0 };
    existing.ids.push(inf.id);
    existing.total += Number(inf.penaltyAmount ?? 0);
    penaltiesByWorker.set(inf.workerId, existing);
  }

  // 6. Calculate and upsert
  let entriesCreated = 0;
  let entriesUpdated = 0;
  let totalGrossPay = 0;
  const workersWithMissingRate: string[] = [];

  for (const [wid, minutes] of byWorker) {
    const worker = workerMap.get(wid);
    if (!worker) continue;

    if (!worker.defaultHourlyRate) {
      workersWithMissingRate.push(worker.name);
      continue;
    }

    const rate = Number(worker.defaultHourlyRate);
    const regularPay = (minutes.regularMinutes / 60) * rate;
    const overtimePay = (minutes.overtimeMinutes / 60) * rate * 1.5;
    const penalties = penaltiesByWorker.get(wid);
    const penaltyDeductions = penalties?.total ?? 0;
    const grossPay = regularPay + overtimePay - penaltyDeductions;

    // Check if entry already exists
    const existing = await prisma.payrollEntry.findUnique({
      where: { periodId_workerId: { periodId, workerId: wid } },
      select: { id: true },
    });

    if (existing) {
      await prisma.payrollEntry.update({
        where: { id: existing.id },
        data: {
          hourlyRate: rate,
          regularMinutes: minutes.regularMinutes,
          overtimeMinutes: minutes.overtimeMinutes,
          regularPay,
          overtimePay,
          penaltyDeductions,
          grossPay,
        },
      });
      entriesUpdated++;
    } else {
      await prisma.payrollEntry.create({
        data: {
          periodId,
          workerId: wid,
          empresaId: user.empresaId,
          hourlyRate: rate,
          regularMinutes: minutes.regularMinutes,
          overtimeMinutes: minutes.overtimeMinutes,
          regularPay,
          overtimePay,
          penaltyDeductions,
          grossPay,
        },
      });
      entriesCreated++;
    }

    totalGrossPay += grossPay;
  }

  return NextResponse.json({
    data: {
      periodId,
      entriesCreated,
      entriesUpdated,
      totalGrossPay: Math.round(totalGrossPay * 100) / 100,
      workersWithMissingRate,
    },
    success: true,
  });
}
