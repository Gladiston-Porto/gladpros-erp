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

        // Fetch worker name before delete (separate from the junction table to avoid TOCTOU)
        const worker = await prisma.worker.findUnique({
            where: { id: workerId },
            select: { name: true },
        });

        // Delete directly — handle P2025 (not found) instead of read-then-delete pattern
        // This prevents MySQL error 1020 on concurrent requests for the same record
        try {
            await prisma.serviceOrderTechnician.delete({
                where: { serviceOrderId_workerId: { serviceOrderId, workerId } },
            });
        } catch (err: unknown) {
            const prismaErr = err as { code?: string };
            if (prismaErr?.code === 'P2025') {
                return NextResponse.json(
                    { error: 'Not found', message: 'Técnico não está na equipe', success: false },
                    { status: 404 }
                );
            }
            throw err;
        }

        await prisma.serviceOrderHistory.create({
            data: {
                serviceOrderId,
                eventType: 'TECHNICIAN_REMOVED',
                reason: `Técnico removido da equipe: ${worker?.name ?? `ID ${workerId}`}`,
                createdById: Number(user.id),
            },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    });

