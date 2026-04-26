import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

// GET /api/service-orders/[id]/scope-items - List scope items
export const GET = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'read')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { id } = await params;
        const serviceOrderId = parseInt(id);

        if (isNaN(serviceOrderId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        const items = await prisma.serviceOrderScopeItem.findMany({
            where: { serviceOrderId },
            orderBy: { sortOrder: 'asc' }
        });

        return NextResponse.json({ data: items, success: true }, { status: 200 });
    });

// POST schema
const createScopeItemSchema = z.object({
    description: z.string().min(1).max(500),
    sortOrder: z.number().optional()
});

// POST /api/service-orders/[id]/scope-items - Add scope item
export const POST = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'create')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { id } = await params;
        const serviceOrderId = parseInt(id);

        if (isNaN(serviceOrderId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        const order = await prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            select: { status: true }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem não encontrada', success: false },
                { status: 404 }
            );
        }

        if (!['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(order.status)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Não é possível adicionar tarefas neste status', success: false },
                { status: 400 }
            );
        }

        const body = createScopeItemSchema.safeParse(await request.json());
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

        const { description, sortOrder } = body.data;

        // If sortOrder provided by client, use it directly.
        // If not, query MAX — but wrap in a retry loop to handle concurrent insertions.
        let finalSortOrder = sortOrder;

        if (finalSortOrder === undefined) {
            const maxItem = await prisma.serviceOrderScopeItem.findFirst({
                where: { serviceOrderId },
                orderBy: { sortOrder: 'desc' },
                select: { sortOrder: true }
            });
            finalSortOrder = (maxItem?.sortOrder ?? -1) + 1;
        }

        // Use createMany-style resilience: if unique constraint hit (P2002), bump sortOrder and retry once
        let item;
        try {
            item = await prisma.serviceOrderScopeItem.create({
                data: { serviceOrderId, description, sortOrder: finalSortOrder }
            });
        } catch (err: unknown) {
            const prismaErr = err as { code?: string };
            if (prismaErr?.code === 'P2002') {
                // sortOrder collision — find real max and add 1
                const maxItem = await prisma.serviceOrderScopeItem.findFirst({
                    where: { serviceOrderId },
                    orderBy: { sortOrder: 'desc' },
                    select: { sortOrder: true }
                });
                item = await prisma.serviceOrderScopeItem.create({
                    data: { serviceOrderId, description, sortOrder: (maxItem?.sortOrder ?? -1) + 1 }
                });
            } else {
                throw err;
            }
        }

        return NextResponse.json({ data: item, success: true }, { status: 201 });
    });
