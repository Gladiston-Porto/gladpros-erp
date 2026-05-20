/**
 * API REST - TRANSAÇÃO BANCÁRIA
 * 
 * POST /api/financeiro/contas/[id]/transacao - Criar nova transação
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import {
  createBankTransactionSchema,
  validarSaldoDisponivel,
  type CreateBankTransactionInput
} from "@/schemas/bank-account.schema";
import { postLedgerTransaction } from "@/shared/services/ledgerPostingService";

/**
 * POST - Criar nova transação bancária
 */
export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "create")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const accountId = parseInt(params.id);
    
    if (isNaN(accountId)) {
      return NextResponse.json({
        success: false,
        message: "ID da conta inválido"
      }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Adiciona accountId ao body se não estiver presente
    body.accountId = accountId;
    // Single-tenant: force empresaId from user context for security
     
     
    body.empresaId = user.empresaId;
    
    // Valida dados
    const validated = createBankTransactionSchema.parse(body) as CreateBankTransactionInput;
    
    // Verifica se conta existe e está ativa
    const conta = await prisma.bankAccount.findFirst({
      where: { id: accountId, empresaId: user.empresaId },
      select: {
        id: true,
        empresaId: true,
        nome: true,
        saldoAtual: true,
        limiteCredito: true,
        ativo: true
      }
    });
    
    if (!conta) {
      return NextResponse.json({
        success: false,
        message: "Conta não encontrada"
      }, { status: 404 });
    }
    
    if (!conta.ativo) {
      return NextResponse.json({
        success: false,
        message: "Não é possível criar transação em conta inativa"
      }, { status: 400 });
    }
    
    // Verifica se empresaId corresponde
    if (conta.empresaId !== user.empresaId) {
      return NextResponse.json({
        success: false,
        message: "Empresa da transação não corresponde à empresa da conta"
      }, { status: 400 });
    }
    
    // Se vinculado a receita/despesa, verifica se existem
    if (validated.revenueId) {
      const revenue = await prisma.revenue.findFirst({
        where: { id: validated.revenueId, empresaId: user.empresaId },
        select: { id: true, valor: true, status: true }
      });
      
      if (!revenue) {
        return NextResponse.json({
          success: false,
          message: "Receita não encontrada"
        }, { status: 404 });
      }
      
      if (validated.tipo !== "CREDITO") {
        return NextResponse.json({
          success: false,
          message: "Receitas só podem ser vinculadas a transações de crédito"
        }, { status: 400 });
      }

      if (revenue.status !== "PENDENTE") {
        return NextResponse.json({
          success: false,
          message: `Receita não pode ser liquidada com status: ${revenue.status}`
        }, { status: 409 });
      }

      // Valida valor da transação com valor da receita
      if (Math.abs(Number(revenue.valor) - validated.valor) > 0.01) {
        return NextResponse.json({
          success: false,
          message: `Valor da transação ($ ${validated.valor.toFixed(2)}) não corresponde ao valor da receita ($ ${Number(revenue.valor).toFixed(2)})`
        }, { status: 400 });
      }
    }
    
    if (validated.expenseId) {
      const expense = await prisma.expense.findFirst({
        where: { id: validated.expenseId, empresaId: user.empresaId },
        select: { id: true, valor: true, status: true }
      });
      
      if (!expense) {
        return NextResponse.json({
          success: false,
          message: "Despesa não encontrada"
        }, { status: 404 });
      }
      
      if (validated.tipo !== "DEBITO") {
        return NextResponse.json({
          success: false,
          message: "Despesas só podem ser vinculadas a transações de débito"
        }, { status: 400 });
      }

      if (expense.status !== "APROVADA") {
        return NextResponse.json({
          success: false,
          message: "Despesa deve estar aprovada antes de ser paga por transação bancária"
        }, { status: 409 });
      }

      // Valida valor da transação com valor da despesa
      if (Math.abs(Number(expense.valor) - validated.valor) > 0.01) {
        return NextResponse.json({
          success: false,
          message: `Valor da transação ($ ${validated.valor.toFixed(2)}) não corresponde ao valor da despesa ($ ${Number(expense.valor).toFixed(2)})`
        }, { status: 400 });
      }
    }
    
    // Valida saldo disponível para débitos
    const saldoAnterior = Number(conta.saldoAtual);
    const validacaoSaldo = validarSaldoDisponivel(
      saldoAnterior,
      conta.limiteCredito ? Number(conta.limiteCredito) : null,
      validated.valor,
      validated.tipo
    );
    
    if (!validacaoSaldo.valido) {
      return NextResponse.json({
        success: false,
        message: validacaoSaldo.mensagem
      }, { status: 400 });
    }
    
    // Cria transação e atualiza saldo da conta em transação
    const resultado = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.bankAccount.findFirst({
        where: { id: accountId, empresaId: user.empresaId },
        select: { id: true, saldoAtual: true, limiteCredito: true, ativo: true },
      });

      if (!contaAtual || !contaAtual.ativo) {
        throw new Error("Conta não encontrada ou inativa");
      }

      const saldoAnteriorTx = Number(contaAtual.saldoAtual);
      const validacaoSaldoTx = validarSaldoDisponivel(
        saldoAnteriorTx,
        contaAtual.limiteCredito ? Number(contaAtual.limiteCredito) : null,
        validated.valor,
        validated.tipo
      );

      if (!validacaoSaldoTx.valido) {
        throw new Error(validacaoSaldoTx.mensagem);
      }

      if (validated.revenueId) {
        const claimedRevenue = await tx.revenue.updateMany({
          where: {
            id: validated.revenueId,
            empresaId: user.empresaId,
            status: "PENDENTE",
          },
          data: {
            status: "RECEBIDA",
            dataPagamento: validated.dataTransacao,
          },
        });

        if (claimedRevenue.count !== 1) {
          throw new Error("Receita já foi liquidada ou alterada por outra transação");
        }
      }

      if (validated.expenseId) {
        const claimedExpense = await tx.expense.updateMany({
          where: {
            id: validated.expenseId,
            empresaId: user.empresaId,
            status: "APROVADA",
          },
          data: {
            status: "PAGA",
            dataPagamento: validated.dataTransacao,
          },
        });

        if (claimedExpense.count !== 1) {
          throw new Error("Despesa já foi paga/rejeitada ou alterada por outra transação");
        }
      }

      const creditTypes = ["CREDITO", "TRANSFERENCIA_ENTRADA", "JUROS", "ESTORNO"];
      const isCredit = creditTypes.includes(validated.tipo);
      const amount = new Decimal(validated.valor);

      if (isCredit) {
        await tx.bankAccount.update({
          where: { id: accountId },
          data: { saldoAtual: { increment: amount } },
        });
      } else {
        const updated = await tx.bankAccount.updateMany({
          where: {
            id: accountId,
            empresaId: user.empresaId,
            ativo: true,
            saldoAtual: { gte: amount },
          },
          data: { saldoAtual: { decrement: amount } },
        });
        if (updated.count === 0) {
          throw new Error("Saldo insuficiente ou conta alterada durante a transação");
        }
      }

      const updatedAccount = await tx.bankAccount.findUniqueOrThrow({
        where: { id: accountId },
        select: { saldoAtual: true },
      });
      const saldoPosteriorTx = Number(updatedAccount.saldoAtual);
      const saldoAnteriorFinal = isCredit
        ? new Decimal(updatedAccount.saldoAtual).minus(amount)
        : new Decimal(updatedAccount.saldoAtual).plus(amount);

      // Cria transação
      const transacao = await tx.bankTransaction.create({
        data: {
          ...validated,
          empresaId: user.empresaId,
          saldoAnterior: saldoAnteriorFinal,
            
          saldoPosterior: saldoPosteriorTx
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        include: {
          account: {
            select: {
              id: true,
              nome: true,
              banco: true
            }
          },
          revenue: validated.revenueId ? {
            select: {
              id: true,
              descricao: true,
              valor: true
            }
          } : undefined,
          expense: validated.expenseId ? {
            select: {
              id: true,
              descricao: true,
              valor: true
            }
          } : undefined
        }
      });
      
      await postLedgerTransaction(
        {
          empresaId: user.empresaId,
          data: validated.dataTransacao,
          descricao: `Transação bancária #${transacao.id}: ${validated.descricao}`,
          sourceType: "BANK_TRANSFER",
          sourceId: transacao.id,
          entries:
            validated.tipo === "CREDITO"
              ? [
                { accountCode: "CASH", debit: new Decimal(validated.valor), memo: validated.descricao },
                { accountCode: "REVENUE", credit: new Decimal(validated.valor), memo: "Entrada bancária manual" },
              ]
              : [
                { accountCode: "EXPENSE", debit: new Decimal(validated.valor), memo: validated.descricao },
                { accountCode: "CASH", credit: new Decimal(validated.valor), memo: "Saída bancária manual" },
              ],
        },
        tx
      );
      
      return transacao;
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: 'BankTransaction',
        entidadeId: String(resultado.id),
        acao: 'TRANSACAO_CRIADA',
        diff: JSON.stringify({ valor: resultado.valor, tipo: resultado.tipo, accountId: resultado.accountId }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Transação criada com sucesso",
      data: {
        ...resultado,
        saldoAtualizado: resultado.saldoPosterior
      }
    }, { status: 201 });
    
  });
