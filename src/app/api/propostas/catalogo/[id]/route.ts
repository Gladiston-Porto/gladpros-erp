import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

const updateSchema = z.object({
  nome: z.string().min(1).max(300).optional(),
  descricao: z.string().max(500).optional(),
  codigo: z.string().max(50).optional(),
  categoria: z.string().max(100).optional(),
  unidade: z.string().max(30).optional(),
  precoUnitario: z.number().nonnegative().optional(),
  tipo: z.enum(['servico', 'material', 'equipamento']).optional(),
  ativo: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 });
  }
  const { id } = await params;
  const item = await prisma.catalogoItem.findFirst({
    where: { id: parseInt(id), empresaId: user.empresaId, deletedAt: null },
  });
  if (!item) return NextResponse.json({ error: 'Item não encontrado', success: false }, { status: 404 });
  return NextResponse.json({
    data: { ...item, precoUnitario: item.precoUnitario ? Number(item.precoUnitario) : null },
    success: true,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'update')) {
    return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 });
  }
  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message, success: false },
      { status: 400 }
    );
  }
  const { id } = await params;
  const item = await prisma.catalogoItem.update({
    where: { id: parseInt(id), empresaId: user.empresaId },
    data: body.data,
  });
  return NextResponse.json({
    data: { ...item, precoUnitario: item.precoUnitario ? Number(item.precoUnitario) : null },
    success: true,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'update')) {
    return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 });
  }
  const { id } = await params;
  await prisma.catalogoItem.update({
    where: { id: parseInt(id), empresaId: user.empresaId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ data: { deleted: true }, success: true });
}
