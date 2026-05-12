/**
 * API Route: /api/financeiro/despesas/[id]/pagar
 * 
 * Endpoint para registrar pagamento de despesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { payExpenseSchema } from '@/schemas/expense.schema';
import {  } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";

export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "update")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
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

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: "Expense",
        entidadeId: String(expenseId),
        acao: "EXPENSE_PAID",
        diff: JSON.stringify({ expenseId, valor: String(updatedExpense.valor), dataPagamento: String(validatedData.dataPagamento) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento registrado com sucesso',
      data: updatedExpense
    });

  });
