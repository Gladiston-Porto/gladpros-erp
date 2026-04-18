/**
 * API Route: /api/financeiro/despesas/[id]
 * 
 * Endpoints:
 * - GET: Obter detalhes de uma despesa
 * - PUT: Atualizar despesa
 * - DELETE: Cancelar despesa (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateExpenseSchema } from '@/schemas/expense.schema';
import { ZodError } from 'zod';

// ========================================
// GET: Detalhes da despesa
// ========================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            cor: true,
            icone: true,
            orcamentoMensal: true
          }
        },
        fornecedor: {
          select: {
            id: true,
            nome: true,
            documento: true,
            email: true,
            telefone: true
          }
        },
        usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true
          }
        },
        aprovacao: {
          include: {
            aprovador: {
              select: {
                id: true,
                nomeCompleto: true,
                email: true
              }
            },
            proximoAprovador: {
              select: {
                id: true,
                nomeCompleto: true,
                email: true
              }
            }
          }
        },
        empresa: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    });

    if (!expense) {
      return NextResponse.json({
        success: false,
        error: 'Despesa não encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('Erro ao buscar despesa:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar despesa',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// ========================================
// PUT: Atualizar despesa
// ========================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    // Verificar se despesa existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: { aprovacao: true }
    });

    if (!existingExpense) {
      return NextResponse.json({
        success: false,
        error: 'Despesa não encontrada'
      }, { status: 404 });
    }

    // Verificar se pode editar
    if (existingExpense.status === 'PAGA') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível editar despesa já paga'
      }, { status: 400 });
    }

    if (existingExpense.status === 'CANCELADA') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível editar despesa cancelada'
      }, { status: 400 });
    }

    // Se está aguardando aprovação, só pode editar se reprovar primeiro
    if (existingExpense.status === 'AGUARDANDO_APROVACAO') {
      return NextResponse.json({
        success: false,
        error: 'Despesa aguardando aprovação. Cancele a solicitação antes de editar.'
      }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateExpenseSchema.parse(body);

    // Atualizar despesa
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        ...validatedData,
        atualizadoEm: new Date()
      },
      include: {
        categoria: true,
        fornecedor: true,
        usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true
          }
        },
        aprovacao: {
          include: {
            aprovador: {
              select: {
                id: true,
                nomeCompleto: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Despesa atualizada com sucesso',
      data: updatedExpense
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validação falhou',
        details: error.issues
      }, { status: 400 });
    }

    console.error('Erro ao atualizar despesa:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao atualizar despesa',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// ========================================
// DELETE: Cancelar despesa (soft delete)
// ========================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    // Verificar se despesa existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: { aprovacao: true }
    });

    if (!existingExpense) {
      return NextResponse.json({
        success: false,
        error: 'Despesa não encontrada'
      }, { status: 404 });
    }

    // Verificar se pode cancelar
    if (existingExpense.status === 'PAGA') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível cancelar despesa já paga. Solicite estorno.'
      }, { status: 400 });
    }

    if (existingExpense.status === 'CANCELADA') {
      return NextResponse.json({
        success: false,
        error: 'Despesa já está cancelada'
      }, { status: 400 });
    }

    // Cancelar despesa e aprovação (se houver)
    await prisma.$transaction(async (tx) => {
      // Cancelar despesa
      await tx.expense.update({
        where: { id },
        data: {
          status: 'CANCELADA',
          atualizadoEm: new Date()
        }
      });

      // Cancelar aprovação pendente
      if (existingExpense.aprovacaoId) {
        await tx.expenseApproval.update({
          where: { id: existingExpense.aprovacaoId },
          data: {
            status: 'CANCELADA',
            atualizadoEm: new Date()
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Despesa cancelada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cancelar despesa:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao cancelar despesa',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
