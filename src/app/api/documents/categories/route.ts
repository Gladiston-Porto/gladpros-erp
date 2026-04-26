import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

/**
 * GET /api/documents/categories - Categorias reais de documentos
 * Usa a tabela Categoria do sistema
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'documents', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const categorias = await prisma.categoria.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      tipo: true,
      descricao: true,
    },
  });

  // Also include fixed document categories
  const fixedCategories = [
    { id: 'propostas', nome: 'Propostas', tipo: 'PROPOSTA', descricao: 'Documentos de propostas' },
    { id: 'projetos', nome: 'Projetos', tipo: 'PROJETO', descricao: 'Documentos de projetos' },
    { id: 'invoices', nome: 'Invoices', tipo: 'INVOICE', descricao: 'Faturas e recibos' },
  ];

  const allCategories = [
    ...fixedCategories.map((c) => ({
      id: String(c.id),
      name: c.nome,
      slug: c.nome.toLowerCase().replace(/\s+/g, '-'),
      description: c.descricao,
      type: c.tipo,
    })),
    ...categorias.map((c) => ({
      id: String(c.id),
      name: c.nome,
      slug: c.nome.toLowerCase().replace(/\s+/g, '-'),
      description: c.descricao,
      type: c.tipo,
    })),
  ];

  return NextResponse.json(allCategories);
});
