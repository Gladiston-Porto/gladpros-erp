import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

// PATCH schema
const updateScopeItemSchema = z.object({
    description: z.string().min(1).max(500).optional(),
    status: z.enum(['PENDING', 'DONE', 'BLOCKED']).optional(),
    sortOrder: z.number().optional()
});

// PATCH /api/service-orders/[id]/scope-items/[itemId] - Update scope item
export const PATCH = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'update')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { id, itemId } = await params;
        const serviceOrderId = parseInt(id);
        const scopeItemId = parseInt(itemId);

        if (isNaN(serviceOrderId) || isNaN(scopeItemId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        // Check order and item exist
        const existing = await prisma.serviceOrderScopeItem.findFirst({
            where: { id: scopeItemId, serviceOrderId },
            include: { ServiceOrder: { select: { status: true } } }
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Not found', message: 'Tarefa não encontrada', success: false },
                { status: 404 }
            );
        }

        if (['CLOSED', 'CANCELED', 'WRITE_OFF'].includes(existing.ServiceOrder.status)) {
            return NextResponse.json(
                { error: 'Validation failed', message: `Não é possível editar tarefas em OS com status ${existing.ServiceOrder.status}`, success: false },
                { status: 400 }
            );
        }

        const body = updateScopeItemSchema.safeParse(await request.json());
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

        // Single update with combined where — avoids two-step findFirst+update race (MySQL 1020)
        let updated;
        try {
            updated = await prisma.serviceOrderScopeItem.update({
                where: { id: scopeItemId, serviceOrderId },
                data: body.data
            });
        } catch (err: unknown) {
            // MySQL 1020 or Prisma P2034: concurrent modification — return 409 so UI can retry
            const code = (err as { code?: string })?.code;
            if (code === 'P2034' || code === 'P2025') {
                return NextResponse.json(
                    { error: 'Conflict', message: 'Registro modificado simultaneamente. Tente novamente.', success: false },
                    { status: 409 }
                );
            }
            throw err;
        }

        return NextResponse.json({ data: updated, success: true }, { status: 200 });
    });

// DELETE /api/service-orders/[id]/scope-items/[itemId] - Delete scope item
export const DELETE = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'update')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { id, itemId } = await params;
        const serviceOrderId = parseInt(id);
        const scopeItemId = parseInt(itemId);

        if (isNaN(serviceOrderId) || isNaN(scopeItemId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        // Check OS status before deleting
        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            select: { status: true }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        if (['CLOSED', 'CANCELED', 'WRITE_OFF'].includes(order.status)) {
            return NextResponse.json(
                { error: 'Validation failed', message: `Não é possível excluir tarefas em OS com status ${order.status}`, success: false },
                { status: 400 }
            );
        }

        const result = await prisma.serviceOrderScopeItem.deleteMany({
            where: { id: scopeItemId, serviceOrderId }
        });

        if (result.count === 0) {
            return NextResponse.json(
                { error: 'Not found', message: 'Tarefa não encontrada', success: false },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: { deleted: true }, success: true }, { status: 200 });
    });
