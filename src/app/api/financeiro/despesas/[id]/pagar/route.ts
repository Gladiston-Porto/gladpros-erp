/**
 * API Route: /api/financeiro/despesas/[id]/pagar
 * 
 * Endpoint para registrar pagamento de despesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { payExpenseSchema } from '@/schemas/expense.schema';
import {  } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { postLedgerTransaction } from "@/shared/services/ledgerPostingService";

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
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, empresaId: user.empresaId },
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

    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id: validatedData.bankAccountId,
        empresaId: user.empresaId,
        ativo: true,
      },
      select: {
        id: true,
        saldoAtual: true,
      },
    });

    if (!bankAccount) {
      return NextResponse.json({
        success: false,
        error: 'Conta bancária não encontrada ou inativa'
      }, { status: 404 });
    }

    const valorDespesa = new Decimal(expense.valor);
    if (new Decimal(bankAccount.saldoAtual).lt(valorDespesa)) {
      return NextResponse.json({
        success: false,
        error: 'Saldo bancário insuficiente para pagar a despesa'
      }, { status: 409 });
    }

    // Registrar pagamento, baixa bancária e auditoria em uma única transação
    const updatedExpense = await prisma.$transaction(async (tx) => {
      const payableStatus = expense.requerAprovacao ? 'APROVADA' : 'PENDENTE';
      const markedPaid = await tx.expense.updateMany({
        where: { id: expenseId, empresaId: user.empresaId, status: payableStatus },
        data: {
          status: 'PAGA',
          dataPagamento: validatedData.dataPagamento,
          formaPagamento: validatedData.formaPagamento || expense.formaPagamento,
          observacoes: validatedData.observacoes
            ? `${expense.observacoes || ''}\n\n[PAGAMENTO] ${validatedData.observacoes}`.trim()
            : expense.observacoes,
          atualizadoEm: new Date()
        },
      });

      if (markedPaid.count !== 1) {
        throw new Error('Despesa não está disponível para pagamento');
      }

      const paidExpense = await tx.expense.findFirstOrThrow({
        where: { id: expenseId, empresaId: user.empresaId },
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

      const debited = await tx.bankAccount.updateMany({
        where: { id: validatedData.bankAccountId, empresaId: user.empresaId, ativo: true, saldoAtual: { gte: valorDespesa } },
        data: { saldoAtual: { decrement: valorDespesa } },
      });

      if (debited.count !== 1) {
        throw new Error('Saldo bancário insuficiente para pagar a despesa');
      }

      const updatedAccount = await tx.bankAccount.findUniqueOrThrow({
        where: { id: validatedData.bankAccountId },
        select: { saldoAtual: true },
      });
      const saldoPosterior = new Decimal(updatedAccount.saldoAtual);

      await tx.bankTransaction.create({
        data: {
          accountId: validatedData.bankAccountId,
          empresaId: user.empresaId,
          tipo: 'DEBITO',
          categoria: 'EXPENSE_PAYMENT',
          valor: valorDespesa,
          descricao: `Pagamento de despesa #${expenseId}: ${expense.descricao}`,
          dataTransacao: validatedData.dataPagamento,
          saldoAnterior: saldoPosterior.plus(valorDespesa),
          saldoPosterior,
          expenseId,
          observacoes: validatedData.observacoes ?? null,
        },
      });

      await postLedgerTransaction(
        {
          empresaId: user.empresaId,
          data: validatedData.dataPagamento,
          descricao: `Pagamento de despesa #${expenseId}: ${expense.descricao}`,
          sourceType: 'EXPENSE_PAYMENT',
          sourceId: expenseId,
          entries: [
            {
              accountCode: 'EXPENSE',
              debit: valorDespesa,
              memo: expense.descricao,
            },
            {
              accountCode: 'CASH',
              credit: valorDespesa,
              memo: 'Saída de caixa para pagamento de despesa',
            },
          ],
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: Number(user.id),
          entidade: "Expense",
          entidadeId: String(expenseId),
          acao: "EXPENSE_PAID",
          diff: JSON.stringify({
            expenseId,
            bankAccountId: validatedData.bankAccountId,
            valor: String(paidExpense.valor),
            dataPagamento: String(validatedData.dataPagamento),
            saldoAnterior: saldoPosterior.plus(valorDespesa).toFixed(2),
            saldoPosterior: saldoPosterior.toFixed(2),
          }),
        },
      });

      return paidExpense;
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento registrado com sucesso',
      data: updatedExpense
    });

  });
