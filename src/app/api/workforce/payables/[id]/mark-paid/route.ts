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

    const body = await request.json();

    if (!body.paymentMethod) {
        return errorResponse('paymentMethod é obrigatório', ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const result = await markPayableAsPaid({
        payableId: parseInt(id),
        paidById: user.id,
        paymentMethod: body.paymentMethod,
        paymentRef: body.paymentRef
    });

    return successResponse(result);
}

export const POST = withErrorHandler(postHandler);
