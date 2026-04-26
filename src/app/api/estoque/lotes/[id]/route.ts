import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { z } from 'zod';

const updateLoteSchema = z.object({
  dataFabricacao: z.string().datetime().nullable().optional(),
  dataValidade: z.string().datetime().nullable().optional(),
  observacoes: z.string().max(255).nullable().optional(),
});

// GET /api/estoque/lotes/[id] - Get lot detail
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;

  const lote = await prisma.materialLote.findUnique({
    where: { id: parseInt(id) },
    include: {
      material: { select: { id: true, nome: true, codigo: true, unidade: true } },
      saldos: {
        include: {
          localizacao: { select: { id: true, nome: true, codigo: true } }
        }
      },
      movimentacoes: {
        take: 20,
        orderBy: { criadoEm: 'desc' },
        select: {
          id: true,
          tipo: true,
          quantidade: true,
          motivo: true,
          criadoEm: true,
          localizacaoOrigem: { select: { nome: true } },
          localizacaoDestino: { select: { nome: true } },
        }
      },
      _count: { select: { saldos: true, movimentacoes: true } },
    }
  });

  if (!lote) {
    return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data: lote });
});

// PATCH /api/estoque/lotes/[id] - Update lot
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
  const validated = updateLoteSchema.parse(body);

  const existing = await prisma.materialLote.findUnique({ where: { id: parseInt(id) } });
  if (!existing) {
    return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (validated.dataFabricacao !== undefined) {
    data.dataFabricacao = validated.dataFabricacao ? new Date(validated.dataFabricacao) : null;
  }
  if (validated.dataValidade !== undefined) {
    data.dataValidade = validated.dataValidade ? new Date(validated.dataValidade) : null;
  }
  if (validated.observacoes !== undefined) {
    data.observacoes = validated.observacoes;
  }

  const lote = await prisma.materialLote.update({
    where: { id: parseInt(id) },
    data,
  });

  return NextResponse.json({ data: lote });
});

// DELETE /api/estoque/lotes/[id] - Delete lot (only if no stock)
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'delete')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { id } = await params;
  const lotId = parseInt(id);

  const lote = await prisma.materialLote.findUnique({
    where: { id: lotId },
    include: { _count: { select: { saldos: true, movimentacoes: true } } }
  });

  if (!lote) {
    return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
  }

  if (lote._count.saldos > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir lote com saldos existentes' },
      { status: 409 }
    );
  }

  if (lote._count.movimentacoes > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir lote com movimentações registradas' },
      { status: 409 }
    );
  }

  await prisma.materialLote.delete({ where: { id: lotId } });
  return NextResponse.json({ message: 'Lote removido com sucesso' });
});
