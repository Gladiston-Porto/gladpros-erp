/**
 * API: /api/workforce/workers/[id]
 * 
 * GET - Get single worker by ID
 * PUT - Update worker
 * DELETE - Delete worker (soft delete via status)
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { ApiErrorCode } from '@/lib/api/types';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/workforce/workers/[id]
async function getHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    const { id } = await params;

    const worker = await prisma.worker.findUnique({
        where: { id: parseInt(id) },
        include: {
            financialProfile: {
                select: {
                    id: true,
                    paymentMethod: true,
                    payeeName: true,
                    accountLast4: true,
                    taxIdLast4: true,
                    preferredPayday: true
                    // NÃO inclui encrypted*
                }
            },
            habilidades: true,
            documentos: true,
            _count: {
                select: {
                    assignments: true,
                    payables: true
                }
            }
        }
    });

    if (!worker) {
        return errorResponse('Worker não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    return successResponse(worker);
}

// PUT /api/workforce/workers/[id]
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

    const existingWorker = await prisma.worker.findUnique({
        where: { id: parseInt(id) },
        include: { financialProfile: true }
    });

    if (!existingWorker) {
        return errorResponse('Worker não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    // Normalizar email: trim, lowercase, vazio → null
    let emailNormalized: string | null = null;
    let email: string | null = body.email ?? null;
    if (email && typeof email === 'string') {
        const trimmed = email.trim().toLowerCase();
        if (trimmed.length > 0) {
            emailNormalized = trimmed;
            email = trimmed;
        } else {
            email = null;
        }
    }

    const worker = await prisma.worker.update({
        where: { id: parseInt(id) },
        data: {
            name: body.name,
            email,
            emailNormalized,
            phone: body.phone || null,
            addressLine1: body.addressLine1,
            addressLine2: body.addressLine2,
            city: body.city,
            state: body.state,
            zip: body.zip,
            type: body.type,
            companyName: body.companyName,
            ein: body.ein,
            status: body.status,
            defaultHourlyRate: body.defaultHourlyRate,
            // Atualizar ou criar WorkerFinancialProfile
            ...(body.financialProfile && {
                financialProfile: existingWorker.financialProfile
                    ? {
                        update: {
                            paymentMethod: body.financialProfile.paymentMethod,
                            payeeName: body.financialProfile.payeeName,
                            accountLast4: body.financialProfile.accountLast4,
                            taxIdLast4: body.financialProfile.taxIdLast4,
                            preferredPayday: body.financialProfile.preferredPayday
                        }
                    }
                    : {
                        create: {
                            paymentMethod: body.financialProfile.paymentMethod || 'CHECK',
                            payeeName: body.financialProfile.payeeName,
                            accountLast4: body.financialProfile.accountLast4,
                            taxIdLast4: body.financialProfile.taxIdLast4,
                            preferredPayday: body.financialProfile.preferredPayday
                        }
                    }
            })
        },
        include: {
            financialProfile: {
                select: {
                    id: true,
                    paymentMethod: true,
                    payeeName: true,
                    accountLast4: true,
                    taxIdLast4: true
                }
            }
        }
    });

    return successResponse(worker);
}

// DELETE /api/workforce/workers/[id]
async function deleteHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'delete')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    if (user.role !== 'ADMIN') {
        return errorResponse('Apenas Admin pode excluir workers', undefined, 403);
    }
    const { id } = await params;

    const existingWorker = await prisma.worker.findUnique({
        where: { id: parseInt(id) }
    });

    if (!existingWorker) {
        return errorResponse('Worker não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    // Soft delete: mudar status para INACTIVE
    const worker = await prisma.worker.update({
        where: { id: parseInt(id) },
        data: { status: 'INACTIVE' }
    });

    return successResponse({ message: 'Worker desativado com sucesso', worker });
}

export const GET = withErrorHandler(getHandler);
export const PUT = withErrorHandler(putHandler);
export const DELETE = withErrorHandler(deleteHandler);
