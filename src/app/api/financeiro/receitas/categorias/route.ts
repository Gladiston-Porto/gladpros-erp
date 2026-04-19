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

    const searchParams = request.nextUrl.searchParams;
    const empresaId = parseInt(searchParams.get('empresaId') || '0');

    if (!empresaId || isNaN(empresaId)) {
      return NextResponse.json(
        { error: 'empresaId é obrigatório' },
        { status: 400 }
      );
    }

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
