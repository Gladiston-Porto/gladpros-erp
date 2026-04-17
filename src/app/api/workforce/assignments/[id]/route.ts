/**
 * API: /api/workforce/assignments/[id]
 * 
 * GET - Get assignment by ID
 * PUT - Update assignment (status, rate, etc.)
 * DELETE - Soft delete (set status to CANCELLED)
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { ApiErrorCode } from '@/lib/api/types';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/workforce/assignments/[id]
async function getHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
        where: { id: parseInt(id) },
        include: {
            worker: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    type: true
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
            timesheets: {
                orderBy: { createdAt: 'desc' },
                take: 5
            },
            _count: {
                select: {
                    timesheets: true,
                    milestones: true
                }
            }
        }
    });

    if (!assignment) {
        return errorResponse('Assignment não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    return successResponse(assignment);
}

// PUT /api/workforce/assignments/[id]
async function putHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'update')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    const { id } = await params;

    const body = await request.json();

    const assignment = await prisma.assignment.findUnique({
        where: { id: parseInt(id) }
    });

    if (!assignment) {
        return errorResponse('Assignment não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    const updateData: any = {};

    if (body.status) updateData.status = body.status;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.costRateHourly !== undefined) updateData.costRateHourly = body.costRateHourly;
    if (body.fixedCostAmount !== undefined) updateData.fixedCostAmount = body.fixedCostAmount;
    if (body.payType !== undefined) updateData.payType = body.payType;

    // If cancelling, set effectiveTo
    if (body.status === 'CANCELLED' || body.status === 'COMPLETED') {
        updateData.effectiveTo = new Date();
    }

    const updated = await prisma.assignment.update({
        where: { id: parseInt(id) },
        data: updateData,
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
    });

    return successResponse(updated);
}

// DELETE /api/workforce/assignments/[id]
async function deleteHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'delete')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
        where: { id: parseInt(id) }
    });

    if (!assignment) {
        return errorResponse('Assignment não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    // Soft delete - set status to CANCELLED
    await prisma.assignment.update({
        where: { id: parseInt(id) },
        data: {
            status: 'CANCELLED',
            effectiveTo: new Date()
        }
    });

    return successResponse({ message: 'Assignment removido com sucesso' });
}

export const GET = withErrorHandler(getHandler);
export const PUT = withErrorHandler(putHandler);
export const DELETE = withErrorHandler(deleteHandler);
