import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';

const empresaUpdateSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  razaoSocial: z.string().min(1).max(200).optional(),
  cnpj: z.string().max(18).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  telefone: z.string().max(32).optional().nullable(),
  addressStreet: z.string().max(255).optional().nullable(),
  addressUnit: z.string().max(50).optional().nullable(),
  addressCity: z.string().max(100).optional().nullable(),
  addressState: z.string().max(2).optional().nullable(),
  addressZip: z.string().max(20).optional().nullable(),
  addressCounty: z.string().max(100).optional().nullable(),
});

/**
 * GET /api/empresa - Retorna dados da empresa (id: 1)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  if (!can(user.role as Role, 'configuracoes', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const empresa = await prisma.empresa.findFirst({
    select: {
      id: true,
      nome: true,
      razaoSocial: true,
      cnpj: true,
      email: true,
      telefone: true,
      addressStreet: true,
      addressUnit: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      addressCounty: true,
      tipoTributacao: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  });

  if (!empresa) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Empresa não encontrada. Execute o seed inicial.', success: false },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: empresa, success: true });
});

/**
 * PUT /api/empresa - Atualizar dados da empresa (ADMIN only)
 */
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  if (!can(user.role as Role, 'configuracoes', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const body = await request.json();
  const validData = empresaUpdateSchema.parse(body);

  // Buscar empresa existente
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Empresa não encontrada.', success: false },
      { status: 404 }
    );
  }

  // Preparar dados para atualização (apenas campos enviados)
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(validData)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ data: empresa, success: true });
  }

  const updated = await prisma.empresa.update({
    where: { id: empresa.id },
    data: updateData,
    select: {
      id: true,
      nome: true,
      razaoSocial: true,
      cnpj: true,
      email: true,
      telefone: true,
      addressStreet: true,
      addressUnit: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      addressCounty: true,
      tipoTributacao: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  });

  return NextResponse.json({ data: updated, success: true });
});
