
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const DELETE = withErrorHandler(async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) => {
        const user = await requireUser(request);
        if (!can(user.role as Role, 'estoque', 'delete')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Sem permissão', success: false },
                { status: 403 }
            );
        }

        const params = await context.params;
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return NextResponse.json({ error: 'Validation failed', message: 'ID inválido', success: false }, { status: 400 });
        }

        // Verificar vínculos antes de excluir
        const categoria = await prisma.categoria.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        filhos: true,
                        materiais: true,
                        equipamentos: true,
                    }
                }
            }
        });

        if (!categoria) {
            return NextResponse.json({ error: 'Not found', message: 'Categoria não encontrada', success: false }, { status: 404 });
        }

        const temVinculos =
            categoria._count.filhos > 0 ||
            categoria._count.materiais > 0 ||
            categoria._count.equipamentos > 0;

        if (temVinculos) {
            return NextResponse.json({
                error: 'Validation failed',
                message: 'Não é possível excluir categoria com itens ou subcategorias vinculadas.',
                success: false
            }, { status: 400 });
        }

        await prisma.categoria.delete({
            where: { id },
        });

        return NextResponse.json({ data: { id }, success: true });

    });
