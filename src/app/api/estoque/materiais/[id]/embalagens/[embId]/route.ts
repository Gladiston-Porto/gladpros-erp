/**
 * API: MATERIAL EMBALAGEM INDIVIDUAL
 * Arquivo: src/app/api/estoque/materiais/[id]/embalagens/[embId]/route.ts
 * 
 * Endpoints:
 * - GET    /api/estoque/materiais/[id]/embalagens/[embId] - Detalhes da embalagem
 * - PUT    /api/estoque/materiais/[id]/embalagens/[embId] - Atualiza embalagem
 * - DELETE /api/estoque/materiais/[id]/embalagens/[embId] - Desativa embalagem
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    notFoundResponse,
    validationErrorResponse,
    withErrorHandler,
    logger,
    createLogContext,
    forbiddenResponse
} from '@/lib/api';
import { materialEmbalagemSchema } from '@/lib/estoque/validation';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

type RouteParams = { params: Promise<{ id: string; embId: string }> };

/**
 * GET /api/estoque/materiais/[id]/embalagens/[embId]
 * 
 * Retorna detalhes de uma embalagem específica
 */
async function getHandler(request: NextRequest, { params }: RouteParams) {
    const user = await requireUser(request);

    if (!can(user.role as Role, 'estoque', 'read')) {
        return forbiddenResponse('Você não tem permissão para visualizar embalagens');
    }

    // 3. VALIDAÇÃO IDs
    const { id: idParam, embId: embIdParam } = await params;
    const materialId = parseInt(idParam);
    const embalagemId = parseInt(embIdParam);

    if (isNaN(materialId) || isNaN(embalagemId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 4. BUSCA EMBALAGEM
    const embalagem = await prisma.materialEmbalagem.findFirst({
        where: {
            id: embalagemId,
            materialId
        },
        include: {
            material: {
                select: {
                    id: true,
                    codigo: true,
                    nome: true,
                    unidade: { select: { codigo: true, nome: true } }
                }
            }
        }
    });

    if (!embalagem) {
        return notFoundResponse('Embalagem não encontrada');
    }

    // 5. RESPOSTA
    return successResponse({ embalagem });
}

/**
 * PUT /api/estoque/materiais/[id]/embalagens/[embId]
 * 
 * Atualiza uma embalagem existente
 */
async function putHandler(request: NextRequest, { params }: RouteParams) {
    const user = await requireUser(request);

    if (!can(user.role as Role, 'estoque', 'update')) {
        return forbiddenResponse('Você não tem permissão para editar embalagens');
    }

    // 3. VALIDAÇÃO IDs
    const { id: idParam, embId: embIdParam } = await params;
    const materialId = parseInt(idParam);
    const embalagemId = parseInt(embIdParam);

    if (isNaN(materialId) || isNaN(embalagemId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 4. PARSE BODY
    const body = await request.json();

    // 5. VALIDAÇÃO ZOD
    const validation = materialEmbalagemSchema.safeParse(body);
    if (!validation.success) {
        const errors = validation.error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
        }));
        return validationErrorResponse(errors);
    }


    const dados = validation.data;

    // 6. VERIFICA SE EMBALAGEM EXISTE
    const existing = await prisma.materialEmbalagem.findFirst({
        where: { id: embalagemId, materialId }
    });

    if (!existing) {
        return notFoundResponse('Embalagem não encontrada');
    }

    // 7. VERIFICA SE NOVO UPC JÁ EXISTE (se mudou)
    if (dados.upcEan !== existing.upcEan) {
        const duplicateUpc = await prisma.materialEmbalagem.findUnique({
            where: { upcEan: dados.upcEan }
        });

        if (duplicateUpc) {
            return validationErrorResponse([{
                field: 'upcEan',
                message: 'Este UPC/EAN já está cadastrado'
            }]);
        }
    }

    // 8. ATUALIZA EMBALAGEM
    const embalagem = await prisma.materialEmbalagem.update({
        where: { id: embalagemId },
        data: {
            upcEan: dados.upcEan,
            brand: dados.brand,
            model: dados.model,
            packageType: dados.packageType,
            baseQtyPerUnit: dados.baseQtyPerUnit,
            purchaseUnit: dados.purchaseUnit
        }
    });

    // 9. LOG
    logger.info(
        `Embalagem atualizada: ${embalagem.upcEan}`,
        createLogContext(request, user),
        { embalagemId }
    );

    // 10. RESPOSTA
    return successResponse(
        { embalagem },
        `Embalagem ${embalagem.upcEan} atualizada com sucesso`
    );
}

/**
 * DELETE /api/estoque/materiais/[id]/embalagens/[embId]
 * 
 * Desativa uma embalagem (soft delete)
 */
async function deleteHandler(request: NextRequest, { params }: RouteParams) {
    const user = await requireUser(request);

    if (!can(user.role as Role, 'estoque', 'delete')) {
        return forbiddenResponse('Você não tem permissão para remover embalagens');
    }

    // 3. VALIDAÇÃO IDs
    const { id: idParam, embId: embIdParam } = await params;
    const materialId = parseInt(idParam);
    const embalagemId = parseInt(embIdParam);

    if (isNaN(materialId) || isNaN(embalagemId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 4. VERIFICA SE EMBALAGEM EXISTE
    const existing = await prisma.materialEmbalagem.findFirst({
        where: { id: embalagemId, materialId }
    });

    if (!existing) {
        return notFoundResponse('Embalagem não encontrada');
    }

    // 5. SOFT DELETE
    await prisma.materialEmbalagem.update({
        where: { id: embalagemId },
        data: { ativo: false }
    });

    // 6. LOG
    logger.info(
        `Embalagem desativada: ${existing.upcEan}`,
        createLogContext(request, user),
        { embalagemId }
    );

    // 7. RESPOSTA
    return successResponse(
        { id: embalagemId },
        `Embalagem ${existing.upcEan} removida com sucesso`
    );
}

export const GET = withErrorHandler(getHandler);
export const PUT = withErrorHandler(putHandler);
export const DELETE = withErrorHandler(deleteHandler);
