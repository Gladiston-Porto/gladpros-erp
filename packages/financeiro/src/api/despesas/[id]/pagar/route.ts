/**
 * API Route: /api/financeiro/despesas/[id]/pagar
 * 
 * Endpoint para registrar pagamento de despesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { payExpenseSchema } from '@/schemas/expense.schema';
import { ZodError } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expenseId = parseInt(params.id);

    if (isNaN(expenseId)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = payExpenseSchema.parse({
      ...body,
      expenseId
    });

    // Verificar se despesa existe
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        aprovacao: true
      }
    });

    if (!expense) {
      return NextResponse.json({
        success: false,
        error: 'Despesa não encontrada'
      }, { status: 404 });
    }

    // Verificar se despesa já foi paga
    if (expense.status === 'PAGA') {
      return NextResponse.json({
        success: false,
        error: 'Despesa já foi paga'
      }, { status: 400 });
    }

    // Verificar se despesa está cancelada
    if (expense.status === 'CANCELADA') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível pagar despesa cancelada'
      }, { status: 400 });
    }

    // Se requer aprovação, verificar se foi aprovada
    if (expense.requerAprovacao && expense.status !== 'APROVADA') {
      return NextResponse.json({
        success: false,
        error: 'Despesa requer aprovação antes do pagamento'
      }, { status: 400 });
    }

    // Verificar se data de pagamento não é anterior à emissão
    if (validatedData.dataPagamento < expense.dataEmissao) {
      return NextResponse.json({
        success: false,
        error: 'Data de pagamento não pode ser anterior à data de emissão'
      }, { status: 400 });
    }

    // Registrar pagamento
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: 'PAGA',
        dataPagamento: validatedData.dataPagamento,
        formaPagamento: validatedData.formaPagamento || expense.formaPagamento,
        observacoes: validatedData.observacoes 
          ? `${expense.observacoes || ''}\n\n[PAGAMENTO] ${validatedData.observacoes}`.trim()
          : expense.observacoes,
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
      message: 'Pagamento registrado com sucesso',
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

    console.error('Erro ao registrar pagamento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao registrar pagamento',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
