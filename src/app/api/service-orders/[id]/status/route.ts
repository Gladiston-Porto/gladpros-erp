import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ServiceOrderStatus } from '@prisma/client';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { eventBus } from '@/server/events/event-bus';
import { releaseReservations, consumeMaterials } from '@/server/services/stockService';

// State Machine Rules [V3.1 AJUSTE #6]
const STATE_MACHINE: Record<ServiceOrderStatus, {
    allowed: ServiceOrderStatus[];
    rules: Array<{
        to: ServiceOrderStatus;
        check?: string;
        msg?: string;
        action?: string;
    }>;
}> = {
    DRAFT: {
        allowed: ['SCHEDULED', 'CANCELED'],
        rules: [
            { to: 'SCHEDULED', check: 'hasValidSchedule', msg: 'Data de agendamento obrigatória' }
        ]
    },
    SCHEDULED: {
        allowed: ['IN_PROGRESS', 'CANCELED'],
        rules: [
            { to: 'CANCELED', action: 'releaseReservations' }
        ]
    },
    IN_PROGRESS: {
        allowed: ['COMPLETED'],
        rules: []
    },
    COMPLETED: {
        allowed: ['AWAITING_PAYMENT'],
        rules: [
            { to: 'AWAITING_PAYMENT', check: 'hasInvoice', msg: 'Fatura não foi gerada' }
        ]
    },
    AWAITING_PAYMENT: {
        allowed: ['CLOSED', 'WRITE_OFF'],
        rules: [
            { to: 'CLOSED', check: 'invoiceIsPaid', msg: 'Fatura não está paga' }
        ]
    },
    CLOSED: { allowed: [], rules: [] },
    WRITE_OFF: { allowed: [], rules: [] },
    CANCELED: {
        allowed: ['DRAFT'],  // Allow reopen
        rules: [
            { to: 'DRAFT' }  // Reopen requires reason (validated below)
        ]
    }
};

// Validation schema
const statusChangeSchema = z.object({
    newStatus: z.enum([
        'DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED',
        'AWAITING_PAYMENT', 'CLOSED', 'WRITE_OFF', 'CANCELED'
    ]),
    reason: z.string().optional(), // For cancellation/write-off/reopen
    force: z.boolean().optional()  // Skip some checks (admin only)
});

// Check functions
async function checkRule(check: string, order: {
    id: number;
    scheduledDate: Date | null;
    scheduleType: string;
    scheduleDateStart: Date | null;
    scheduleDateEnd: Date | null;
    invoiceId: number | null;
}): Promise<boolean> {
    switch (check) {
        case 'hasValidSchedule':
            if (order.scheduleType === 'FIXED') {
                return order.scheduledDate !== null;
            } else {
                return order.scheduleDateStart !== null && order.scheduleDateEnd !== null;
            }

        case 'hasInvoice':
            return order.invoiceId !== null;

        case 'invoiceIsPaid':
            if (!order.invoiceId) return false;
            const invoice = await prisma.invoice.findUnique({
                where: { id: order.invoiceId },
                select: { status: true }
            });
            return invoice?.status === 'PAID';

        default:
            return true;
    }
}

// Stock actions are now delegated to stockService (C15, C16)

// PATCH /api/service-orders/[id]/status - State machine transition
export const PATCH = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'update')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }
        const userId = Number(user.id);

        const { id } = await params;
        const serviceOrderId = parseInt(id);

        if (isNaN(serviceOrderId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        const body = statusChangeSchema.safeParse(await request.json());
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

        const { newStatus, reason, force } = body.data;

        // Get current order
        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: { Invoice: { select: { status: true } } }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        const currentStatus = order.status;
        const rules = STATE_MACHINE[currentStatus];

        // Check if transition is allowed
        if (!rules.allowed.includes(newStatus)) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    message: `Transição ${currentStatus} → ${newStatus} não permitida`,
                    success: false,
                },
                { status: 400 }
            );
        }

        // C5: force=true requires elevated role
        if (force && !['ADMIN', 'GERENTE'].includes(user.role)) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Apenas ADMIN ou GERENTE podem forçar transições', success: false },
                { status: 403 }
            );
        }

        // Run validation checks (unless forced by admin/gerente)
        if (!force) {
            for (const rule of rules.rules.filter(r => r.to === newStatus && r.check)) {
                const passed = await checkRule(rule.check!, order);
                if (!passed) {
                    return NextResponse.json(
                        {
                            error: 'Validation failed',
                            message: rule.msg || 'Validação falhou',
                            success: false,
                        },
                        { status: 400 }
                    );
                }
            }
        }

        // Require reason for cancellation/write-off/reopen
        const requiresReason = newStatus === 'CANCELED' || newStatus === 'WRITE_OFF' ||
            (currentStatus === 'CANCELED' && newStatus === 'DRAFT');

        if (requiresReason && (!reason || reason.trim().length === 0)) {
            const action = newStatus === 'DRAFT' ? 'reabertura' :
                newStatus === 'WRITE_OFF' ? 'write-off' : 'cancelamento';
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    message: `Motivo obrigatório para ${action}`,
                    success: false,
                },
                { status: 400 }
            );
        }

        // Execute transition in transaction
        const updated = await prisma.$transaction(async (tx) => {
            // C15: Release stock reservations on CANCELED (creates CANCELAMENTO_RESERVA movements)
            if (newStatus === 'CANCELED') {
                await releaseReservations(serviceOrderId, tx, { userId });
            }

            // C16: Consume materials on COMPLETED (creates SAIDA movements, decrements materialSaldo)
            if (newStatus === 'COMPLETED') {
                await consumeMaterials(serviceOrderId, tx, { userId });
            }

            // Build update data
            const updateData: Record<string, unknown> = { status: newStatus };

            // Set timestamps
            switch (newStatus) {
                case 'SCHEDULED':
                    updateData.scheduledAt = new Date();
                    break;
                case 'IN_PROGRESS':
                    updateData.startedAt = new Date();
                    break;
                case 'COMPLETED':
                    updateData.completedAt = new Date();
                    break;
                case 'CLOSED':
                    updateData.closedAt = new Date();
                    updateData.closedById = userId;
                    break;
                case 'CANCELED':
                    updateData.canceledAt = new Date();
                    updateData.cancellationReason = reason;
                    updateData.canceledById = userId;
                    break;
                case 'WRITE_OFF':
                    updateData.writtenOffAt = new Date();
                    updateData.writeOffReason = reason;
                    updateData.writtenOffById = userId;
                    break;
            }

            // Create history entry
            const eventType = newStatus === 'CANCELED' ? 'CANCELED'
                : (currentStatus === 'CANCELED' && newStatus === 'DRAFT') ? 'REOPENED'
                    : 'STATUS_CHANGED';

            await tx.serviceOrderHistory.create({
                data: {
                    serviceOrderId,
                    eventType: eventType as 'STATUS_CHANGED' | 'CANCELED' | 'REOPENED',
                    fromStatus: currentStatus,
                    toStatus: newStatus,
                    reason: reason || null,
                    createdById: userId,
                }
            });

            return tx.serviceOrder.update({
                where: { id: serviceOrderId },
                data: updateData,
                include: {
                    Cliente: { select: { id: true, nomeFantasia: true, nomeCompleto: true } },
                    AssignedWorker: { select: { id: true, name: true } }
                }
            });
        });

        // Emit domain events (best-effort, outside transaction)
        eventBus.emit({
            name: 'serviceOrder.statusChanged',
            aggregateType: 'serviceOrder',
            aggregateId: String(serviceOrderId),
            payload: { serviceOrderId, oldStatus: currentStatus, newStatus, changedBy: userId },
        }).catch((err) => console.error('[SO Status] Failed to emit statusChanged:', err));

        if (newStatus === 'COMPLETED') {
            eventBus.emit({
                name: 'serviceOrder.completed',
                aggregateType: 'serviceOrder',
                aggregateId: String(serviceOrderId),
                payload: { serviceOrderId, completedBy: userId },
            }).catch((err) => console.error('[SO Status] Failed to emit completed:', err));
        }

        return NextResponse.json({
            data: {
                previousStatus: currentStatus,
                currentStatus: newStatus,
                order: updated
            },
            success: true
        }, { status: 200 });
    });
