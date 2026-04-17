/**
 * API: /api/workforce/payables
 * 
 * GET - List payables
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/workforce/payables
async function getHandler(request: NextRequest) {
    // FINANCEIRO, ADMIN, GERENTE can view payables
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    const status = searchParams.get('status');

    const where: any = {};

    if (workerId) {
        where.workerId = parseInt(workerId);
    }

    if (status) where.status = status;

    const payables = await prisma.payable.findMany({
        where,
        include: {
            worker: {
                select: { id: true, name: true, email: true, type: true }
            },
            lineItems: true,
            _count: { select: { lineItems: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return successResponse(payables);
}

export const GET = withErrorHandler(getHandler);
