/**
 * API: /api/workforce/timesheets/[id]/submit
 * 
 * POST - Submit timesheet for approval
 */

import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { submitTimesheet } from '@/shared/services/workforceService';

async function postHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'create')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    const { id } = await params;

    const timesheet = await submitTimesheet(parseInt(id), Number(user.id));

    return successResponse(timesheet);
}

export const POST = withErrorHandler(postHandler);
