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
