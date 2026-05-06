import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { z } from 'zod';

const updateLocalizacaoSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  tipo: z.enum(['DEPOSITO', 'PRATELEIRA', 'BIN', 'ARMARIO', 'VAN']).optional(),
  descricao: z.string().max(255).nullable().optional(),
  ativo: z.boolean().optional(),
});

// GET /api/estoque/localizacoes/[id] - Get location detail
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;

  const localizacao = await prisma.localizacao.findUnique({
    where: { id: Number(id) },
    include: {
      saldosMateriais: {
        include: {
          material: { select: { id: true, nome: true, codigo: true, unidade: true } },
          lote: { select: { id: true, codigoLote: true } },
        },
        take: 50,
      },
      _count: { select: { saldosMateriais: true } },
    }
  });

  if (!localizacao) {
    return NextResponse.json({ error: 'Localização não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ data: localizacao });
});

// PATCH /api/estoque/localizacoes/[id] - Update location
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const validated = updateLocalizacaoSchema.parse(body);

  const existing = await prisma.localizacao.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    return NextResponse.json({ error: 'Localização não encontrada' }, { status: 404 });
  }

  const localizacao = await prisma.localizacao.update({
    where: { id: Number(id) },
    data: validated,
  });

  return NextResponse.json({ data: localizacao });
});

// DELETE /api/estoque/localizacoes/[id] - Deactivate location
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'delete')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;

  const localizacao = await prisma.localizacao.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { saldosMateriais: true } } }
  });

  if (!localizacao) {
    return NextResponse.json({ error: 'Localização não encontrada' }, { status: 404 });
  }

  if (localizacao._count.saldosMateriais > 0) {
    // Soft deactivate if has stock
    await prisma.localizacao.update({ where: { id: Number(id) }, data: { ativo: false } });
    return NextResponse.json({ message: 'Localização desativada (possui saldos vinculados)' });
  }

  await prisma.localizacao.delete({ where: { id: Number(id) } });
  return NextResponse.json({ message: 'Localização removida' });
});
