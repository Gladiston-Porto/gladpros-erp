import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

// DELETE /api/service-orders/[id]/technicians/[workerId] — remove team member (any status)
export const DELETE = withErrorHandler(async (request: Request,
    { params }: { params: Promise<{ id: string; workerId: string }> }) => {
        const user = await requireUser(request as NextRequest);
        if (!can(user.role as Role, 'service-orders', 'update')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { id, workerId: workerIdStr } = await params;
        const serviceOrderId = parseInt(id);
        const workerId = parseInt(workerIdStr);

        if (isNaN(serviceOrderId) || isNaN(workerId)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'ID inválido', success: false },
                { status: 400 }
            );
        }

        const existing = await prisma.serviceOrderTechnician.findUnique({
            where: { serviceOrderId_workerId: { serviceOrderId, workerId } },
            include: { worker: { select: { name: true } } },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Not found', message: 'Técnico não está na equipe', success: false },
                { status: 404 }
            );
        }

        await prisma.serviceOrderTechnician.delete({
            where: { serviceOrderId_workerId: { serviceOrderId, workerId } },
        });

        await prisma.serviceOrderHistory.create({
            data: {
                serviceOrderId,
                eventType: 'TECHNICIAN_REMOVED',
                reason: `Técnico removido da equipe: ${existing.worker.name}`,
                createdById: Number(user.id),
            },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    });
