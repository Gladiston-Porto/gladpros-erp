import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

const createSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  descricao: z.string().max(500).optional(),
  titulo: z.string().max(300).optional(),
  escopo: z.string().optional(),
  condicoes: z.string().optional(),
  observacoes: z.string().optional(),
  etapasJson: z.string().optional(),
  materiaisJson: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const templates = await prisma.propostaTemplate.findMany({
    where: { empresaId: user.empresaId, deletedAt: null },
    select: { id: true, nome: true, descricao: true, titulo: true, createdAt: true },
    orderBy: { nome: 'asc' },
  });
  return NextResponse.json({ data: templates, success: true });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 },
    );
  }
  const template = await prisma.propostaTemplate.create({
    data: { ...body.data, empresaId: user.empresaId },
  });
  return NextResponse.json({ data: template, success: true }, { status: 201 });
}
