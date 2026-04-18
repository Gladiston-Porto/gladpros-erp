// src/app/api/financeiro/receitas/categorias/route.ts
// GET /api/financeiro/receitas/categorias - Listar categorias de receitas

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';

/**
 * GET /api/financeiro/receitas/categorias
 * Listar todas as categorias de receitas ativas
 * Query params: ?empresaId=X
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

  } catch (error: any) {
    console.error('[GET /api/financeiro/receitas/categorias] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar categorias', details: error.message },
      { status: 500 }
    );
  }
}
