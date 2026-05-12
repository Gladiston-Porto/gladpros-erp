/**
 * API: /api/workforce/workers
 * 
 * GET - List all workers (model Worker)
 * POST - Create new worker
 * 
 * REFATORADO: Agora usa model Worker em vez de Colaborador
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { createWorkerSchema } from '@/schemas/workforce.schema';

// GET /api/workforce/workers
async function getHandler(request: NextRequest) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
        where.status = status;
    }

    if (type) {
        where.type = type;
    }

    if (search) {
        where.OR = [
            { name: { contains: search } },
            { email: { contains: search } },
            { companyName: { contains: search } }
        ];
    }

    const [workers, total] = await Promise.all([
        prisma.worker.findMany({
            where,
            include: {
                // Financial profile - SEM dados sensíveis no GET padrão
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
                assignments: {
                    where: { status: 'ACTIVE' },
                    select: { id: true, jobId: true, projectId: true, role: true }
                },
                _count: {
                    select: {
                        assignments: true,
                        payables: true
                    }
                }
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { name: 'asc' }
        }),
        prisma.worker.count({ where })
    ]);

    return successResponse({
        data: workers,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
}

// POST /api/workforce/workers - Criação idempotente
async function postHandler(request: NextRequest) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'create')) {
        return errorResponse('Sem permissão', undefined, 403);
    }

    const body = createWorkerSchema.parse(await request.json());

    const workerType = body.type || 'INDIVIDUAL';

    // Normalizar email: trim, lowercase, vazio → null
    let emailNormalized: string | null = null;
    if (body.email && typeof body.email === 'string') {
        const trimmed = body.email.trim().toLowerCase();
        emailNormalized = trimmed.length > 0 ? trimmed : null;
    }

    // Normalizar EIN: remover tudo exceto números, vazio → null
    let einNormalized: string | null = null;
    if (body.ein && typeof body.ein === 'string') {
        const cleaned = body.ein.replace(/[^0-9]/g, '').trim();
        einNormalized = cleaned.length > 0 ? cleaned : null;
    }

    // ===========================================
    // BUSCA IDEMPOTENTE - ordem de prioridade
    // ===========================================
    let existingWorker = null;

    // 1. Por usuarioId (se fornecido)
    if (!existingWorker && body.usuarioId) {
        existingWorker = await prisma.worker.findUnique({
            where: { usuarioId: body.usuarioId }
        });
    }

    // 3. Por emailNormalized
    if (!existingWorker && emailNormalized) {
        existingWorker = await prisma.worker.findUnique({
            where: { emailNormalized }
        });
    }

    // 4. Por EIN (apenas COMPANY)
    if (!existingWorker && workerType === 'COMPANY' && einNormalized) {
        existingWorker = await prisma.worker.findUnique({
            where: { ein: einNormalized }
        });
    }

    // ===========================================
    // UPSERT com tratamento de race condition
    // ===========================================
    const workerData = {
        usuarioId: body.usuarioId || null,
        name: body.name,
        email: body.email,
        emailNormalized,
        phone: body.phone,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        zip: body.zip,
        type: workerType,
        companyName: body.companyName,
        ein: einNormalized,
        status: body.status || 'ACTIVE',
        defaultHourlyRate: body.defaultHourlyRate
    };

    try {
        let worker;
        let isNew = false;

        if (existingWorker) {
            // UPDATE
            worker = await prisma.worker.update({
                where: { id: existingWorker.id },
                data: ({
                    ...workerData,
                    // Atualizar ou criar financialProfile
                    ...(body.financialProfile && {
                        financialProfile: {
                            upsert: {
                                create: {
                                    paymentMethod: body.financialProfile.paymentMethod || 'CHECK',
                                    payeeName: body.financialProfile.payeeName || body.name
                                },
                                update: {
                                    paymentMethod: body.financialProfile.paymentMethod,
                                    payeeName: body.financialProfile.payeeName
                                }
                            }
                        }
                     
                    })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any,
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
        } else {
            // CREATE
            isNew = true;
            worker = await prisma.worker.create({
                data: ({
                    ...workerData,
                    ...(body.financialProfile && {
                        financialProfile: {
                            create: {
                                paymentMethod: body.financialProfile.paymentMethod || 'CHECK',
                                payeeName: body.financialProfile.payeeName || body.name,
                                accountLast4: body.financialProfile.accountLast4,
                                taxIdLast4: body.financialProfile.taxIdLast4
                            }
                         
                        }
                    })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any,
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
        }

 

        return successResponse(worker, undefined, isNew ? 201 : 200);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // Tratar race condition (violação de chave única)
         
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'campo único';
            return errorResponse(
                `Worker já existe com este ${field}. Use outro valor ou atualize o existente.`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                409 as any
            );
        }
        throw error;
    }
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);

