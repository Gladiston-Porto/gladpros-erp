/**
 * API: /api/workforce/timesheets/[id]/approve
 * 
 * POST - Approve submitted timesheet
 */

import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { approveTimesheet } from '@/shared/services/workforceService';

async function postHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Only ADMIN and GERENTE can approve
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'update')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    const { id } = await params;

    const result = await approveTimesheet(parseInt(id), Number(user.id));

    return successResponse(result);
}

export const POST = withErrorHandler(postHandler);
