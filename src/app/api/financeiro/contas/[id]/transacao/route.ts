/**
 * API REST - TRANSAÇÃO BANCÁRIA
 * 
 * POST /api/financeiro/contas/[id]/transacao - Criar nova transação
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import {
  createBankTransactionSchema,
  calcularSaldoPosterior,
  validarSaldoDisponivel,
  type CreateBankTransactionInput
} from "@/schemas/bank-account.schema";

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
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body.empresaId = (user as any).empresaId ?? 1;
    
    // Valida dados
    const validated = createBankTransactionSchema.parse(body) as CreateBankTransactionInput;
    
    // Verifica se conta existe e está ativa
    const conta = await prisma.bankAccount.findUnique({
      where: { id: accountId },
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
    if (conta.empresaId !== validated.empresaId) {
      return NextResponse.json({
        success: false,
        message: "Empresa da transação não corresponde à empresa da conta"
      }, { status: 400 });
    }
    
    // Se vinculado a receita/despesa, verifica se existem
    if (validated.revenueId) {
      const revenue = await prisma.revenue.findUnique({
        where: { id: validated.revenueId },
        select: { id: true, valor: true, status: true }
      });
      
      if (!revenue) {
        return NextResponse.json({
          success: false,
          message: "Receita não encontrada"
        }, { status: 404 });
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
      const expense = await prisma.expense.findUnique({
        where: { id: validated.expenseId },
        select: { id: true, valor: true, status: true }
      });
      
      if (!expense) {
        return NextResponse.json({
          success: false,
          message: "Despesa não encontrada"
        }, { status: 404 });
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
    
    // Calcula saldo posterior
    const saldoPosterior = calcularSaldoPosterior(
      saldoAnterior,
      validated.valor,
      validated.tipo
    );
    
    // Cria transação e atualiza saldo da conta em transação
    const resultado = await prisma.$transaction(async (tx) => {
      // Cria transação
      const transacao = await tx.bankTransaction.create({
        data: {
          ...validated,
          saldoAnterior,
           
          saldoPosterior
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
      
      // Atualiza saldo da conta
      await tx.bankAccount.update({
        where: { id: accountId },
        data: { saldoAtual: saldoPosterior }
      });
      
      // Se vinculado a receita, atualiza status para PAGO
      if (validated.revenueId) {
        await tx.revenue.update({
          where: { id: validated.revenueId },
          data: {
            status: "RECEBIDA",
            dataPagamento: validated.dataTransacao
          }
        });
      }
      
      // Se vinculado a despesa, atualiza status para PAGA
      if (validated.expenseId) {
        await tx.expense.update({
          where: { id: validated.expenseId },
          data: {
            status: "PAGA",
            dataPagamento: validated.dataTransacao
          }
        });
      }
      
      return transacao;
    });
    
    return NextResponse.json({
      success: true,
      message: "Transação criada com sucesso",
      data: {
        ...resultado,
        saldoAtualizado: saldoPosterior
      }
    }, { status: 201 });
    
  });
