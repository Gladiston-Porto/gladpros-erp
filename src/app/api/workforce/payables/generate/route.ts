/**
 * API: /api/workforce/payables/generate
 * 
 * POST - Generate payable from approved timesheets/milestones
 */

import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { generatePayable } from '@/shared/services/workforceService';
import prisma from '@/lib/prisma';

async function postHandler(request: NextRequest) {
    // Only ADMIN and GERENTE can generate payables
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'create')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const body = await request.json();

    // Validação: workerId obrigatório
    if (!body.workerId) {
        return errorResponse('workerId é obrigatório');
    }

    const payable = await generatePayable({
        workerId: body.workerId,
        periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
        createdById: Number(user.id)
    });

    // Fetch with relations
    const fullPayable = await prisma.payable.findUnique({
        where: { id: payable.id },
        include: {
            worker: { select: { id: true, name: true, email: true } },
            lineItems: true
        }
    });

    return successResponse(fullPayable, undefined, 201);
}

export const POST = withErrorHandler(postHandler);
