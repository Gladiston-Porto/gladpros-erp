import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

const createSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(300),
  descricao: z.string().max(500).optional(),
  codigo: z.string().max(50).optional(),
  categoria: z.string().max(100).optional(),
  unidade: z.string().max(30).default('unit'),
  precoUnitario: z.number().nonnegative().optional(),
  tipo: z.enum(['servico', 'material', 'equipamento']).default('servico'),
});

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const categoria = searchParams.get('categoria') ?? '';
  const tipo = searchParams.get('tipo') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 50)));

  const where = {
    empresaId: user.empresaId,
    deletedAt: null as null,
    ativo: true,
    ...(q ? { nome: { contains: q } } : {}),
    ...(categoria ? { categoria } : {}),
    ...(tipo ? { tipo } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.catalogoItem.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        nome: true,
        descricao: true,
        categoria: true,
        unidade: true,
        precoUnitario: true,
        tipo: true,
      },
      orderBy: { nome: 'asc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.catalogoItem.count({ where }),
  ]);

  const mapped = items.map((item) => ({
    ...item,
    precoUnitario: item.precoUnitario ? Number(item.precoUnitario) : null,
  }));

  return NextResponse.json({
    data: mapped,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    success: true,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para criar itens de catálogo', success: false },
      { status: 403 }
    );
  }

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: body.error.issues[0]?.message ?? 'Dados inválidos',
        success: false,
      },
      { status: 400 }
    );
  }

  const item = await prisma.catalogoItem.create({
    data: { ...body.data, empresaId: user.empresaId },
  });

  return NextResponse.json(
    { data: { ...item, precoUnitario: item.precoUnitario ? Number(item.precoUnitario) : null }, success: true },
    { status: 201 }
  );
}
