/**
 * API: /api/workforce/workers/[id]/sensitive
 * 
 * GET - Retorna dados sensíveis descriptografados
 * POST - Atualiza dados sensíveis (criptografando antes de salvar)
 * 
 * RBAC: Apenas ADMIN e FINANCEIRO podem acessar
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { encrypt, decrypt, getLast4, isEncryptionConfigured } from '@/lib/crypto/sensitive-data';

// GET /api/workforce/workers/[id]/sensitive
async function getHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'read')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    // RBAC: Apenas ADMIN e FINANCEIRO
    if (user.role !== 'ADMIN' && user.role !== 'FINANCEIRO') {
        return errorResponse('Acesso negado. Apenas Admin e Financeiro podem ver dados sensíveis.', undefined, 403);
    }

    const { id } = await params;

    // Verificar se a criptografia está configurada
    if (!isEncryptionConfigured()) {
        return errorResponse('Criptografia não configurada. ENCRYPTION_KEY ausente no .env');
    }

    const workerId = parseInt(id);

    // Buscar worker com perfil financeiro
    const worker = await prisma.worker.findUnique({
        where: { id: workerId },
        include: {
            financialProfile: true
        }
    });

    if (!worker) {
        return errorResponse('Worker não encontrado');
    }

    if (!worker.financialProfile) {
        return successResponse({
            workerId,
            hasFinancialProfile: false,
            sensitive: null
        });
    }

    // Descriptografar dados sensíveis
    let routing: string | null = null;
    let account: string | null = null;
    let taxId: string | null = null;

    try {
        if (worker.financialProfile.encryptedRouting) {
            routing = decrypt(worker.financialProfile.encryptedRouting);
        }
        if (worker.financialProfile.encryptedAccount) {
            account = decrypt(worker.financialProfile.encryptedAccount);
        }
        if (worker.financialProfile.encryptedTaxId) {
            taxId = decrypt(worker.financialProfile.encryptedTaxId);
        }
    } catch (error: any) {
        console.error('Erro ao descriptografar dados:', error);
        return errorResponse('Erro ao descriptografar dados sensíveis');
    }

    // Audit log para acesso a dados sensíveis
    await prisma.auditoria.create({
        data: {
            usuarioId: Number(user.id),
            tabela: 'worker_financial_profiles',
            registroId: worker.financialProfile.id,
            acao: 'CREATE',
            payload: JSON.stringify({
                action: 'ACCESS_SENSITIVE_DATA',
                workerId,
                accessedBy: user.id,
                accessedAt: new Date().toISOString()
            })
        }
    });

    return successResponse({
        workerId,
        hasFinancialProfile: true,
        sensitive: {
            routing,
            account,
            taxId,
            paymentMethod: worker.financialProfile.paymentMethod,
            payeeName: worker.financialProfile.payeeName
        }
    });
}

// POST /api/workforce/workers/[id]/sensitive
async function postHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'workforce', 'update')) {
        return errorResponse('Sem permissão', undefined, 403);
    }
    // RBAC: Apenas ADMIN pode atualizar dados sensíveis
    if (user.role !== 'ADMIN') {
        return errorResponse('Acesso negado. Apenas Admin pode atualizar dados sensíveis.', undefined, 403);
    }

    const { id } = await params;

    if (!isEncryptionConfigured()) {
        return errorResponse('Criptografia não configurada. ENCRYPTION_KEY ausente no .env');
    }

    const workerId = parseInt(id);
    const body = await request.json();

    const worker = await prisma.worker.findUnique({
        where: { id: workerId },
        include: {
            financialProfile: true
        }
    });

    if (!worker) {
        return errorResponse('Worker não encontrado');
    }

    // Preparar dados criptografados
    const updateData: any = {};

    if (body.routing !== undefined) {
        updateData.encryptedRouting = body.routing ? encrypt(body.routing) : null;
    }

    if (body.account !== undefined) {
        updateData.encryptedAccount = body.account ? encrypt(body.account) : null;
        updateData.accountLast4 = getLast4(body.account);
    }

    if (body.taxId !== undefined) {
        updateData.encryptedTaxId = body.taxId ? encrypt(body.taxId) : null;
        updateData.taxIdLast4 = getLast4(body.taxId);
    }

    // Atualizar ou criar perfil financeiro
    let profile;
    if (worker.financialProfile) {
        profile = await prisma.workerFinancialProfile.update({
            where: { id: worker.financialProfile.id },
            data: updateData
        });
    } else {
        profile = await prisma.workerFinancialProfile.create({
            data: {
                workerId,
                paymentMethod: body.paymentMethod || 'CHECK',
                ...updateData
            }
        });
    }

    // Audit log
    await prisma.auditoria.create({
        data: {
            usuarioId: Number(user.id),
            tabela: 'worker_financial_profiles',
            registroId: profile.id,
            acao: 'UPDATE',
            payload: JSON.stringify({
                dadosAntigos: {
                    hadRouting: !!worker.financialProfile?.encryptedRouting,
                    hadAccount: !!worker.financialProfile?.encryptedAccount,
                    hadTaxId: !!worker.financialProfile?.encryptedTaxId
                },
                dadosNovos: {
                    action: 'UPDATE_SENSITIVE_DATA',
                    workerId,
                    updatedBy: user.id,
                    updatedAt: new Date().toISOString(),
                    fieldsUpdated: Object.keys(body)
                }
            })
        }
    });

    return successResponse({
        workerId,
        profileId: profile.id,
        message: 'Dados sensíveis atualizados com sucesso',
        accountLast4: profile.accountLast4,
        taxIdLast4: profile.taxIdLast4
    });
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
