import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { recalculateTotals } from '@/server/services/serviceOrderTotals';

const EDITABLE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_PAYMENT'];

const patchWorkEntrySchema = z.object({
    startedAt:  z.string().optional(),
    endedAt:    z.string().optional(),
    notes:      z.string().optional().nullable(),
    hourlyRate: z.coerce.number().nonnegative().optional(),
});

/**
 * PATCH /api/service-orders/[id]/work-entries/[entryId]
 * Edit an existing work entry (start/end time, notes, hourly rate override).
 * Recalculates totalMinutes, totalCost, and the parent OS laborTotal.
 */
export const PATCH = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; entryId: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }

    const { id, entryId } = await params;
    const serviceOrderId = parseInt(id);
    const workEntryId    = parseInt(entryId);

    if (isNaN(serviceOrderId) || isNaN(workEntryId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const body = patchWorkEntrySchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            {
                error: 'Validation failed',
                message: body.error.issues[0]?.message ?? 'Dados inválidos',
                success: false,
            },
            { status: 400 }
        );
    }

    // Load entry and verify ownership
    const entry = await prisma.workEntry.findUnique({
        where: { id: workEntryId },
        include: { ServiceOrder: { select: { id: true, status: true, hourlyRate: true } } }
    });

    if (!entry || entry.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Registro não encontrado', success: false },
            { status: 404 }
        );
    }

    if (!EDITABLE_STATUSES.includes(entry.ServiceOrder.status)) {
        return NextResponse.json(
            {
                error: 'Validation failed',
                message: `Não é possível editar apontamentos de uma OS com status "${entry.ServiceOrder.status}"`,
                success: false,
            },
            { status: 400 }
        );
    }

    const { startedAt: startRaw, endedAt: endRaw, notes, hourlyRate: rateOverride } = body.data;

    // Use provided values or fall back to existing ones
    const startedAt = startRaw ? new Date(startRaw) : entry.startedAt;
    const endedAt   = endRaw   ? new Date(endRaw)   : entry.endedAt;

    if (endedAt <= startedAt) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'O horário final deve ser maior que o inicial', success: false },
            { status: 400 }
        );
    }

    // Recalculate duration and cost
    const totalMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));
    const hourlyRate   = rateOverride !== undefined ? rateOverride : Number(entry.hourlyRate);
    const totalCost    = (totalMinutes / 60) * hourlyRate;

    const updated = await prisma.workEntry.update({
        where: { id: workEntryId },
        data: {
            startedAt,
            endedAt,
            hourlyRate,
            totalMinutes,
            totalCost,
            ...(notes !== undefined ? { notes: notes ?? null } : {}),
        },
        include: {
            Worker: { select: { id: true, name: true } }
        }
    });

    // Recalculate laborTotal, materialTotal and total on the parent OS
    await recalculateTotals(serviceOrderId);

    return NextResponse.json({ data: updated, success: true }, { status: 200 });
});

/**
 * DELETE /api/service-orders/[id]/work-entries/[entryId]
 * Remove a work entry. Only allowed in editable statuses.
 */
export const DELETE = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string; entryId: string }> }
) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'service-orders', 'update')) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Sem permissão', success: false },
            { status: 403 }
        );
    }

    const { id, entryId } = await params;
    const serviceOrderId = parseInt(id);
    const workEntryId    = parseInt(entryId);

    if (isNaN(serviceOrderId) || isNaN(workEntryId)) {
        return NextResponse.json(
            { error: 'Validation failed', message: 'ID inválido', success: false },
            { status: 400 }
        );
    }

    const entry = await prisma.workEntry.findUnique({
        where: { id: workEntryId },
        include: { ServiceOrder: { select: { id: true, status: true } } }
    });

    if (!entry || entry.serviceOrderId !== serviceOrderId) {
        return NextResponse.json(
            { error: 'Not found', message: 'Registro não encontrado', success: false },
            { status: 404 }
        );
    }

    if (!EDITABLE_STATUSES.includes(entry.ServiceOrder.status)) {
        return NextResponse.json(
            {
                error: 'Validation failed',
                message: `Não é possível remover apontamentos de uma OS com status "${entry.ServiceOrder.status}"`,
                success: false,
            },
            { status: 400 }
        );
    }

    await prisma.workEntry.delete({ where: { id: workEntryId } });
    await recalculateTotals(serviceOrderId);

    return NextResponse.json({ success: true }, { status: 200 });
});
