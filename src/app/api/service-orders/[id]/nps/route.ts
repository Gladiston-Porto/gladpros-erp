import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

const npsSchema = z.object({
    score: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

/**
 * POST /api/service-orders/[id]/nps
 *
 * Submit NPS score for a CLOSED service order.
 * One-time only — returns 409 if already submitted.
 */
export const POST = withErrorHandler(async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) => {
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

    const body = npsSchema.safeParse(await request.json());
    if (!body.success) {
        return NextResponse.json(
            { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
            { status: 400 }
        );
    }

    const { score, comment } = body.data;

    const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: { id: true, status: true, npsScore: true },
    });

    if (!serviceOrder) {
        return NextResponse.json(
            { error: 'Not found', message: 'Ordem de serviço não encontrada', success: false },
            { status: 404 }
        );
    }

    if (serviceOrder.status !== 'CLOSED') {
        return NextResponse.json(
            { error: 'Bad request', message: 'NPS só pode ser enviado em ordens com status CLOSED', success: false },
            { status: 400 }
        );
    }

    if (serviceOrder.npsScore !== null) {
        return NextResponse.json(
            { error: 'Conflict', message: 'NPS já foi enviado para esta ordem de serviço', success: false },
            { status: 409 }
        );
    }

    const updated = await prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
            npsScore: score,
            npsComment: comment ?? null,
            npsRespondedAt: new Date(),
        },
        select: { id: true, npsScore: true },
    });

    return NextResponse.json(
        { data: { serviceOrderId: updated.id, npsScore: updated.npsScore }, success: true },
        { status: 200 }
    );
});
