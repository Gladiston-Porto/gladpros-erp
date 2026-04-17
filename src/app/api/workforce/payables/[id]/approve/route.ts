/**
 * API: /api/workforce/payables/[id]/approve
 * 
 * POST - Approve payable for payment
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { ApiErrorCode } from '@/lib/api/types';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

async function postHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // FINANCEIRO, ADMIN can approve payables
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'update')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    if (user.role !== 'ADMIN' && user.role !== 'FINANCEIRO') {
        return errorResponse('Apenas Admin e Financeiro podem aprovar/marcar pagamentos.', undefined, 403);
    }
    const { id } = await params;

    const payable = await prisma.payable.findUnique({
        where: { id: parseInt(id) }
    });

    if (!payable) {
        return errorResponse('Payable não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    if (payable.status !== 'PENDING') {
        return errorResponse(`Payable precisa estar PENDING para ser aprovado. Status atual: ${payable.status}`, ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const updated = await prisma.payable.update({
        where: { id: parseInt(id) },
        data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedById: user.id
        },
        include: {
            worker: { select: { id: true, name: true, email: true } },
            lineItems: true
        }
    });

    return successResponse(updated);
}

export const POST = withErrorHandler(postHandler);
