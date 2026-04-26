/**
 * API Route: /api/estoque/fornecedores
 * Endpoint para criar fornecedores (Quick Add)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// Schema de validação para criação de fornecedor
const createFornecedorSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(150),
    tipoDocumento: z.enum(['CNPJ', 'EIN', 'CPF']).optional().nullable(),
    documento: z.string().max(30).optional().nullable(),
    email: z.string().email().max(120).optional().nullable().or(z.literal('')),
    telefone: z.string().max(40).optional().nullable(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
        const authUser = await requireUser(request);
        if (!can(authUser.role as Role, 'estoque', 'create')) {
            return NextResponse.json({ error: 'Sem permissão', success: false }, { status: 403 });
        }

        const body = await request.json();
        const parsed = createFornecedorSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { nome, email, telefone } = parsed.data;
        let { tipoDocumento, documento } = parsed.data;

        // Sanitização e Validação de EIN
        if (tipoDocumento === 'EIN' && documento) {
            // Remove tudo que não for dígito
            const einClean = documento.replace(/\D/g, '');

            if (einClean.length !== 9) {
                return NextResponse.json(
                    { error: 'EIN inválido. Deve conter 9 dígitos.' },
                    { status: 400 }
                );
            }

            // Formata: XX-XXXXXXX
            documento = `${einClean.substring(0, 2)}-${einClean.substring(2)}`;
        } else if (!tipoDocumento) {
            // Garante que documento seja null se tipo não informado
            tipoDocumento = null;
            documento = null;
        }

        // Criar fornecedor
        const fornecedor = await prisma.fornecedor.create({
            data: {
                nome,
                tipoDocumento: tipoDocumento || null,
                documento: documento || null,
                email: email || null,
                telefone: telefone || null,
                ativo: true,
            },
            select: {
                id: true,
                nome: true,
            },
        });

        return NextResponse.json(fornecedor, { status: 201 });
    });

export const GET = withErrorHandler(async (request: NextRequest) => {
        const authUser = await requireUser(request);
        if (!can(authUser.role as Role, 'estoque', 'read')) {
            return NextResponse.json({ error: 'Sem permissão', success: false }, { status: 403 });
        }

        const fornecedores = await prisma.fornecedor.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true },
        });

        return NextResponse.json(fornecedores);
    });
