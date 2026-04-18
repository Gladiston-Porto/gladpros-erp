import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { z } from 'zod';


export const GET = withErrorHandler(async (request: NextRequest) => {
        const user = await requireUser(request);
        if (!can(user.role as Role, 'clientes', 'read')) {
            return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
        }

        const querySchema = z.object({
            pageSize: z.coerce.number().min(1).max(1000).optional().default(500),
        });
        const url = new URL(request.url);
        const { pageSize } = querySchema.parse({
            pageSize: url.searchParams.get('pageSize') ?? undefined,
        });

        const clients = await prisma.cliente.findMany({
            where: {
                status: 'ATIVO'
            },
            select: {
                id: true,
                nomeChave: true,
                nomeFantasia: true,
                nomeCompleto: true,
            },
            orderBy: {
                nomeChave: 'asc'
            },
            take: pageSize,
        });

        const mappedClients = clients.map(c => ({
            id: c.id,
            name: c.nomeFantasia || c.nomeCompleto || c.nomeChave
        }));

        return NextResponse.json(mappedClients);
    });
