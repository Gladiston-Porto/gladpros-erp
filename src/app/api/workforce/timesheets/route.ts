/**
 * API: /api/workforce/timesheets
 * 
 * GET - List timesheets
 * POST - Create new timesheet
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { createTimesheetSchema } from '@/schemas/workforce.schema';

// GET /api/workforce/timesheets
async function getHandler(request: NextRequest) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const workerId = searchParams.get('workerId');
    const status = searchParams.get('status');

    const where: any = {};

    if (assignmentId) where.assignmentId = parseInt(assignmentId);
    if (workerId) where.assignment = { workerId: parseInt(workerId) };
    if (status) where.status = status;

    const timesheets = await prisma.timesheet.findMany({
        where,
        include: {
            assignment: {
                include: {
                    worker: {
                        select: { id: true, name: true }
                    },
                    job: {
                        select: { id: true, ticketNumber: true, title: true }
                    },
                    project: {
                        select: { id: true, numeroProjeto: true, titulo: true }
                    }
                }
            },
            entries: true,
            _count: { select: { entries: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return successResponse(timesheets);
}

// POST /api/workforce/timesheets
async function postHandler(request: NextRequest) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'create')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const body = createTimesheetSchema.parse(await request.json());

    const timesheet = await prisma.timesheet.create({
        data: {
            assignmentId: body.assignmentId,
            periodStart: new Date(body.periodStart),
            periodEnd: new Date(body.periodEnd),
            status: 'DRAFT',
            ...(body.entries && {
                entries: {
                    create: body.entries.map((e: any) => ({
                        date: new Date(e.date),
                        hours: e.hours,
                        jobId: e.jobId,
                        projectId: e.projectId,
                        note: e.note,
                        status: 'DRAFT'
                    }))
                }
            })
        },
        include: {
            entries: true,
            assignment: {
                include: {
                    worker: { select: { id: true, name: true } }
                }
            }
        }
    });

    return successResponse(timesheet, undefined, 201);
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
