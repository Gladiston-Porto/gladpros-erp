/**
 * API Route: /api/financeiro/despesas/categorias
 * 
 * Endpoints:
 * - GET: Lista categorias de despesas
 * - POST: Cria nova categoria
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createExpenseCategorySchema } from '@/schemas/expense.schema';
import { ZodError } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';

// ========================================
// GET: Lista categorias
// ========================================
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const ativo = searchParams.get('ativo');

    if (!empresaId) {
      return NextResponse.json({
        success: false,
        error: 'empresaId é obrigatório'
      }, { status: 400 });
    }

    const where: any = {
      empresaId: parseInt(empresaId)
    };

    if (ativo !== null) {
      where.ativo = ativo === 'true';
    }

    const categorias = await prisma.expenseCategory.findMany({
      where,
      orderBy: [
        { ativo: 'desc' },
        { nome: 'asc' }
      ],
      include: {
        _count: {
          select: {
            despesas: true
          }
        }
      }
    });

    // Calcular uso do orçamento (gastos no mês atual)
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const categoriasComGastos = await Promise.all(
      categorias.map(async (categoria) => {
        const gastosDoMes = await prisma.expense.aggregate({
          where: {
            categoriaId: categoria.id,
            dataEmissao: {
              gte: inicioMes,
              lte: fimMes
            },
            status: {
              in: ['PENDENTE', 'APROVADA', 'PAGA', 'AGUARDANDO_APROVACAO']
            }
          },
          _sum: {
            valor: true
          }
        });

        const gastoTotal = Number(gastosDoMes._sum.valor || 0);
        const orcamento = Number(categoria.orcamentoMensal || 0);
        const percentualUsado = orcamento > 0 ? (gastoTotal / orcamento) * 100 : 0;

        return {
          ...categoria,
          gastosDoMes: gastoTotal,
          orcamentoRestante: orcamento - gastoTotal,
          percentualUsado: Math.round(percentualUsado * 100) / 100,
          alerta: percentualUsado >= 90 ? 'critical' : percentualUsado >= 75 ? 'warning' : 'ok'
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: categoriasComGastos,
      meta: {
        total: categorias.length,
        ativas: categorias.filter(c => c.ativo).length,
        inativas: categorias.filter(c => !c.ativo).length
      }
    });

  });

// ========================================
// POST: Criar categoria
// ========================================
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const validatedData = createExpenseCategorySchema.parse(body);

    // Verificar se categoria já existe
    const existingCategory = await prisma.expenseCategory.findUnique({
      where: {
        empresaId_nome: {
          empresaId: validatedData.empresaId,
          nome: validatedData.nome
        }
      }
    });

    if (existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Já existe uma categoria com este nome'
      }, { status: 400 });
    }

    // Criar categoria
    const categoria = await prisma.expenseCategory.create({
      data: validatedData,
      include: {
        _count: {
          select: {
            despesas: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: categoria
    }, { status: 201 });

  });
