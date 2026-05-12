/**
 * API: /api/workforce/assignments
 * 
 * GET - List assignments by worker/job/project
 * POST - Create new assignment
 * 
 * REFATORADO: Usa workerId
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { ApiErrorCode } from '@/lib/api/types';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { getOrCreateAssignmentDefault } from '@/shared/services/workforceService';

// GET /api/workforce/assignments
async function getHandler(request: NextRequest) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    const jobId = searchParams.get('jobId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (workerId) {
        where.workerId = parseInt(workerId);
    }

    if (jobId) where.jobId = parseInt(jobId);
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;

    const assignments = await prisma.assignment.findMany({
        where,
        include: {
            worker: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    type: true,
                    status: true
                }
            },
            job: {
                select: {
                    id: true,
                    ticketNumber: true,
                    title: true,
                    status: true
                }
            },
            project: {
                select: {
                    id: true,
                    numeroProjeto: true,
                    titulo: true,
                    status: true
                }
            },
            _count: {
                select: {
                    timesheets: true,
                    milestones: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return successResponse(assignments);
}

// POST /api/workforce/assignments
async function postHandler(request: NextRequest) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'create')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const body = await request.json();

    // Validação: workerId obrigatório
    if (!body.workerId) {
        return errorResponse('workerId é obrigatório', ApiErrorCode.VALIDATION_ERROR, 400);
    }

    if (!body.jobId && !body.projectId) {
        return errorResponse('jobId ou projectId é obrigatório', ApiErrorCode.VALIDATION_ERROR, 400);
    }

    // Use getOrCreateAssignmentDefault for idempotency
    const assignment = await getOrCreateAssignmentDefault({
        workerId: body.workerId,
        jobId: body.jobId || null,
        projectId: body.projectId || null,
        payType: body.payType,
        costRateHourly: body.costRateHourly,
        fixedCostAmount: body.fixedCostAmount,
        role: body.role,
        createdById: Number(user.id)
    });

    // Fetch with relations
    const fullAssignment = await prisma.assignment.findUnique({
        where: { id: assignment.id },
        include: {
            worker: {
                select: { id: true, name: true, email: true }
            },
            job: {
                select: { id: true, ticketNumber: true, title: true }
            },
            project: {
                select: { id: true, numeroProjeto: true, titulo: true }
            }
        }
    });

    return successResponse(fullAssignment, undefined, 201);
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
