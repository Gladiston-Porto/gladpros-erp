import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

// GET /api/service-orders/[id]/history - List history events
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

        const history = await prisma.serviceOrderHistory.findMany({
            where: { serviceOrderId },
            include: {
                CreatedBy: {
                    select: { id: true, nomeCompleto: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ data: history, success: true }, { status: 200 });
    });
