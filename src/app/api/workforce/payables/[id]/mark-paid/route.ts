/**
 * API: /api/workforce/payables/[id]/mark-paid
 * 
 * POST - Mark payable as paid (creates Expense)
 */

import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { ApiErrorCode } from '@/lib/api/types';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { markPayableAsPaid } from '@/shared/services/workforceService';
import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

const markPaidSchema = z.object({
    paymentMethod: z.nativeEnum(PaymentMethod),
    bankAccountId: z.number().int().positive(),
    paymentRef: z.string().optional(),
});

async function postHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Only FINANCEIRO and ADMIN can mark as paid
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'update')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    if (user.role !== 'ADMIN' && user.role !== 'FINANCEIRO') {
        return errorResponse('Apenas Admin e Financeiro podem aprovar/marcar pagamentos.', undefined, 403);
    }
    const { id } = await params;

    const parsed = markPaidSchema.safeParse(await request.json());
    if (!parsed.success) {
        return errorResponse(
            parsed.error.issues[0]?.message ?? 'Dados inválidos',
            ApiErrorCode.VALIDATION_ERROR,
            400
        );
    }
    const body = parsed.data;

    const result = await markPayableAsPaid({
        payableId: parseInt(id),
        paidById: Number(user.id),
        empresaId: user.empresaId,
        paymentMethod: body.paymentMethod,
        bankAccountId: body.bankAccountId,
        paymentRef: body.paymentRef
    });

    return successResponse(result);
}

export const POST = withErrorHandler(postHandler);
