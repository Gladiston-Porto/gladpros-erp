// src/app/api/financeiro/receitas/categorias/route.ts
// GET /api/financeiro/receitas/categorias - Listar categorias de receitas

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * GET /api/financeiro/receitas/categorias
 * Listar todas as categorias de receitas ativas
 * Query params: ?empresaId=X
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }

    // empresaId always comes from JWT — never from query params
    const empresaId = user.empresaId;

    // Buscar categorias ativas
    const categories = await prisma.revenueCategory.findMany({
      where: {
        empresaId,
        ativo: true
      },
      orderBy: {
        nome: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: categories
    });

  });

/**
 * POST /api/financeiro/receitas/categorias
 * Criar nova categoria de receita
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, "financeiro", "create")) {
    return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
  }

  const { z } = await import("zod");
  const schema = z.object({
    nome: z.string().min(2).max(100),
    cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    descricao: z.string().max(5000).optional(),
  });

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", message: body.error.issues[0]?.message, success: false },
      { status: 400 }
    );
  }

  const { nome, cor, descricao } = body.data;
  const empresaId = user.empresaId;

  const existing = await prisma.revenueCategory.findFirst({ where: { empresaId, nome } });
  if (existing) {
    return NextResponse.json(
      { error: "Conflict", message: "Category name already exists", success: false },
      { status: 409 }
    );
  }

  const category = await prisma.revenueCategory.create({
    data: { empresaId, nome, cor, descricao },
  });

  return NextResponse.json({ data: category, success: true }, { status: 201 });
});
