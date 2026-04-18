import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

const addSchema = z.object({
    workerId: z.number().int().positive(),
});

// POST /api/service-orders/[id]/technicians — add team member (any status)
export const POST = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'update')) {
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

        const body = addSchema.safeParse(await request.json().catch(() => ({})));
        if (!body.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
                { status: 400 }
            );
        }

        const { workerId } = body.data;

        // Verify service order exists
        const order = await prisma.serviceOrder.findUnique({ where: { id: serviceOrderId }, select: { id: true } });
        if (!order) {
            return NextResponse.json(
                { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
                { status: 404 }
            );
        }

        // Verify worker exists and is active
        const worker = await prisma.worker.findUnique({
            where: { id: workerId },
            select: { id: true, name: true, classification: true, status: true, usuario: { select: { avatarUrl: true } } },
        });
        if (!worker) {
            return NextResponse.json(
                { error: 'Not found', message: 'Técnico não encontrado', success: false },
                { status: 404 }
            );
        }
        if (worker.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Técnico inativo', success: false },
                { status: 400 }
            );
        }

        // Upsert — ignore if already a member
        await prisma.serviceOrderTechnician.upsert({
            where: { serviceOrderId_workerId: { serviceOrderId, workerId } },
            create: { serviceOrderId, workerId, addedById: Number(user.id) },
            update: {},
        });

        await prisma.serviceOrderHistory.create({
            data: {
                serviceOrderId,
                eventType: 'TECHNICIAN_ADDED',
                reason: `Técnico adicionado à equipe: ${worker.name}`,
                createdById: Number(user.id),
            },
        });

        return NextResponse.json({ data: worker, success: true }, { status: 201 });
    });
