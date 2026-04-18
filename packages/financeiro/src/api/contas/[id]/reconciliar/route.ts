/**
 * API REST - RECONCILIAÇÃO BANCÁRIA
 * 
 * POST /api/financeiro/contas/[id]/reconciliar - Reconciliar transações
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  reconcileBankTransactionsSchema,
  type ReconcileBankTransactionsInput
} from "@/schemas/bank-account.schema";

/**
 * POST - Reconciliar transações bancárias
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = parseInt(params.id);
    
    if (isNaN(accountId)) {
      return NextResponse.json({
        success: false,
        message: "ID da conta inválido"
      }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Valida dados
    const validated = reconcileBankTransactionsSchema.parse(body) as ReconcileBankTransactionsInput;
    
    // Verifica se conta existe
    const conta = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        nome: true,
        ativo: true
      }
    });
    
    if (!conta) {
      return NextResponse.json({
        success: false,
        message: "Conta não encontrada"
      }, { status: 404 });
    }
    
    // Verifica se transações pertencem à conta
    const transacoes = await prisma.bankTransaction.findMany({
      where: {
        id: { in: validated.transactionIds },
        accountId
      },
      select: {
        id: true,
        descricao: true,
        valor: true,
        reconciliada: true
      }
    });
    
    if (transacoes.length !== validated.transactionIds.length) {
      const encontradas = transacoes.map(t => t.id);
      const naoEncontradas = validated.transactionIds.filter(id => !encontradas.includes(id));
      
      return NextResponse.json({
        success: false,
        message: "Algumas transações não foram encontradas ou não pertencem a esta conta",
        details: {
          naoEncontradas
        }
      }, { status: 404 });
    }
    
    // Filtra transações já reconciliadas
    const jaReconciliadas = transacoes.filter(t => t.reconciliada);
    const aReconciliar = transacoes.filter(t => !t.reconciliada);
    
    if (aReconciliar.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Todas as transações selecionadas já estão reconciliadas"
      }, { status: 400 });
    }
    
    // Reconcilia transações e atualiza conta
    const dataReconciliacao = validated.dataReconciliacao || new Date();
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Atualiza transações
      await tx.bankTransaction.updateMany({
        where: {
          id: { in: aReconciliar.map(t => t.id) }
        },
        data: {
          reconciliada: true,
          dataReconciliacao
        }
      });
      
      // Atualiza data de última conciliação da conta
      await tx.bankAccount.update({
        where: { id: accountId },
        data: {
          ultimaConciliacao: dataReconciliacao
        }
      });
      
      return {
        reconciliadas: aReconciliar.length,
        jaReconciliadas: jaReconciliadas.length,
        transacoes: aReconciliar
      };
    });
    
    return NextResponse.json({
      success: true,
      message: `${resultado.reconciliadas} transação(ões) reconciliada(s) com sucesso`,
      data: {
        reconciliadas: resultado.reconciliadas,
        jaReconciliadas: resultado.jaReconciliadas,
        dataReconciliacao,
        transacoes: resultado.transacoes.map(t => ({
          id: t.id,
          descricao: t.descricao,
          valor: t.valor
        }))
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Erro ao reconciliar transações:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json({
        success: false,
        message: "Erro de validação",
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: "Erro ao reconciliar transações",
      error: error.message
    }, { status: 500 });
  }
}
