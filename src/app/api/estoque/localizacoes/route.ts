import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { z } from 'zod';

const createLocalizacaoSchema = z.object({
  nome: z.string().min(1).max(100),
  codigo: z.string().min(1).max(50),
  tipo: z.enum(['DEPOSITO', 'PRATELEIRA', 'BIN', 'ARMARIO', 'VAN']),
  descricao: z.string().max(255).optional(),
});
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);

  const ativo = searchParams.get('ativo');
  const tipo = searchParams.get('tipo');
  const search = searchParams.get('search');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (ativo !== null) where.ativo = ativo !== 'false';
  if (tipo) where.tipo = tipo;
  if (search) {
    where.OR = [
      { nome: { contains: search } },
      { codigo: { contains: search } }
    ];
  }

  const localizacoes = await prisma.localizacao.findMany({
    where,
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { saldosMateriais: true } }
    }
  });

  return NextResponse.json({ data: localizacoes });
});

// POST /api/estoque/localizacoes - Create location
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'create')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const body = await request.json();
  const validated = createLocalizacaoSchema.parse(body);

  // Check codigo uniqueness
  const existing = await prisma.localizacao.findUnique({ where: { codigo: validated.codigo } });
  if (existing) {
    return NextResponse.json({ error: 'Código já está em uso', message: 'Esse código de localização já existe', success: false }, { status: 409 });
  }

  const localizacao = await prisma.localizacao.create({
    data: {
      nome: validated.nome,
      codigo: validated.codigo,
      tipo: validated.tipo,
      descricao: validated.descricao || null,
    }
  });

  return NextResponse.json({ data: localizacao, success: true }, { status: 201 });
});
