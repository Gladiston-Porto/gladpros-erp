/**
 * API Route: /api/estoque/categorias
 * Gerenciamento de Categorias de Estoque (Materiais e Equipamentos)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

// Schema para criação de categoria
const categoriaSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(100),
    tipo: z.enum(['MATERIAL', 'EQUIPAMENTO']),
    paiId: z.number().int().optional().nullable(),
    descricao: z.string().optional(),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
        const user = await requireUser(request);
        if (!can(user.role as Role, 'estoque', 'read')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const tipo = searchParams.get('tipo');

        // Validação básica do tipo se fornecido
        if (tipo && !['MATERIAL', 'EQUIPAMENTO'].includes(tipo)) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Tipo inválido. Use MATERIAL ou EQUIPAMENTO', success: false },
                { status: 400 }
            );
        }

        const categorias = await prisma.categoria.findMany({
            where: tipo ? { tipo: tipo as any } : undefined,
            orderBy: { nome: 'asc' },
            include: {
                pai: {
                    select: { id: true, nome: true }
                },
                _count: {
                    select: { filhos: true, materiais: true, equipamentos: true }
                }
            }
        });

        return NextResponse.json({ data: categorias, success: true });
    });

export const POST = withErrorHandler(async (request: NextRequest) => {
        const user = await requireUser(request);
        if (!can(user.role as Role, 'estoque', 'create')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const body = await request.json();
        const parsed = categoriaSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Dados inválidos', details: parsed.error.flatten(), success: false },
                { status: 400 }
            );
        }

        const { nome, tipo, paiId, descricao } = parsed.data;

        // Se houver paiId, verificar se existe e se é do mesmo tipo
        if (paiId) {
            const pai = await prisma.categoria.findUnique({
                where: { id: paiId },
            });

            if (!pai) {
                return NextResponse.json(
                    { error: 'Not found', message: 'Categoria pai não encontrada', success: false },
                    { status: 404 }
                );
            }

            if (pai.tipo !== tipo) {
                return NextResponse.json(
                    { error: 'Validation failed', message: 'A categoria pai deve ser do mesmo tipo (MATERIAL/EQUIPAMENTO)', success: false },
                    { status: 400 }
                );
            }
        }

        const categoria = await prisma.categoria.create({
            data: {
                nome,
                tipo: tipo as any,
                paiId: paiId || null,
                descricao,
            },
        });

        return NextResponse.json({ data: categoria, success: true }, { status: 201 });
    });
