/**
 * API: MATERIAL EMBALAGENS (UPC/EAN)
 * Arquivo: src/app/api/estoque/materiais/[id]/embalagens/route.ts
 * 
 * Endpoints:
 * - GET  /api/estoque/materiais/[id]/embalagens - Lista embalagens do material
 * - POST /api/estoque/materiais/[id]/embalagens - Cria nova embalagem
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

/**
 * GET /api/estoque/materiais/[id]/embalagens
 * 
 * Lista todas as embalagens (UPC/EAN) de um material
 */
async function getHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);

    if (!can(user.role as Role, 'estoque', 'read')) {
        return forbiddenResponse('Você não tem permissão para visualizar embalagens');
    }

    // 3. VALIDAÇÃO ID
    const { id: idParam } = await params;
    const materialId = parseInt(idParam);
    if (isNaN(materialId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 4. VERIFICA SE MATERIAL EXISTE
    const material = await prisma.material.findUnique({
        where: { id: materialId },
        select: { id: true, nome: true, codigo: true }
    });

    if (!material) {
        return notFoundResponse('Material não encontrado');
    }

    // 5. BUSCA EMBALAGENS
    const embalagens = await prisma.materialEmbalagem.findMany({
        where: {
            materialId,
            ativo: true
        },
        orderBy: { criadoEm: 'desc' }
    });

    // 6. LOG
    logger.info(
        `Listadas ${embalagens.length} embalagens do material ${materialId}`,
        createLogContext(request, user)
    );

    // 7. RESPOSTA
    return successResponse({
        material: {
            id: material.id,
            nome: material.nome,
            codigo: material.codigo
        },
        embalagens
    });
}

/**
 * POST /api/estoque/materiais/[id]/embalagens
 * 
 * Cria nova embalagem (UPC/EAN) para um material
 */
async function postHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireUser(request);

    if (!can(user.role as Role, 'estoque', 'create')) {
        return forbiddenResponse('Você não tem permissão para criar embalagens');
    }

    // 3. VALIDAÇÃO ID
    const { id: idParam } = await params;
    const materialId = parseInt(idParam);
    if (isNaN(materialId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 4. PARSE BODY
    const body = await request.json();

    // 5. VALIDAÇÃO ZOD
    const validation = materialEmbalagemSchema.safeParse(body);
    if (!validation.success) {
        const errors = validation.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message
        }));
        return validationErrorResponse(errors);
    }

    const dados = validation.data;

    // 6. LOG
    logger.info(
        `Criando embalagem para material ${materialId}`,
        createLogContext(request, user),
        { upcEan: dados.upcEan }
    );

    // 7. VERIFICA SE MATERIAL EXISTE
    const material = await prisma.material.findUnique({
        where: { id: materialId },
        select: { id: true, nome: true, unidade: { select: { codigo: true } } }
    });

    if (!material) {
        return notFoundResponse('Material não encontrado');
    }

    // 8. VERIFICA SE UPC JÁ EXISTE (somente se informado)
    if (dados.upcEan) {
        const existingUpc = await prisma.materialEmbalagem.findUnique({
            where: { upcEan: dados.upcEan }
        });

        if (existingUpc) {
            return validationErrorResponse([{
                field: 'upcEan',
                message: 'Este UPC/EAN já está cadastrado'
            }]);
        }
    }

    // 9. CRIAR EMBALAGEM
    const embalagem = await prisma.materialEmbalagem.create({
        data: {
            materialId,
            upcEan: dados.upcEan ?? null,
            brand: dados.brand,
            model: dados.model,
            packageType: dados.packageType,
            baseQtyPerUnit: dados.baseQtyPerUnit,
            purchaseUnit: dados.purchaseUnit || 'EA',
            precoCompra: dados.precoCompra ?? null,
            ativo: true
        }
    });

    // 10. LOG SUCESSO
    logger.info(
        `Embalagem criada para material ${materialId}: ${dados.packageType} x${dados.baseQtyPerUnit}`,
        createLogContext(request, user),
        { embalagemId: embalagem.id }
    );

    // 11. RESPOSTA
    return successResponse(
        {
            embalagem,
            conversionPreview: `1 ${dados.packageType} = ${dados.baseQtyPerUnit} ${material.unidade.codigo}`
        },
        `Embalagem ${dados.packageType} criada com sucesso`
    );
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
