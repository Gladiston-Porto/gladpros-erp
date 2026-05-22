/**
 * API REST - CONTA BANCÁRIA ESPECÍFICA
 * 
 * GET /api/financeiro/contas/[id] - Detalhes da conta
 * PUT /api/financeiro/contas/[id] - Atualizar conta
 * DELETE /api/financeiro/contas/[id] - Excluir conta
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import {
  updateBankAccountSchema,
  type UpdateBankAccountInput
} from "@/schemas/bank-account.schema";

/**
 * GET - Obter detalhes de uma conta específica
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        message: "ID inválido"
      }, { status: 400 });
    }
    
    const conta = await prisma.bankAccount.findFirst({
      where: { id, empresaId: user.empresaId },
      include: {
        empresa: {
          select: {
            id: true,
            nome: true
          }
        },
        _count: {
          select: {
            transactions: true,
            transfersFrom: true,
            transfersTo: true
          }
        }
      }
    });
    
    if (!conta) {
      return NextResponse.json({
        success: false,
        message: "Conta não encontrada"
      }, { status: 404 });
    }
    
    // Buscar estatísticas adicionais
    const [totalCreditos, totalDebitos, ultimaTransacao] = await Promise.all([
      prisma.bankTransaction.aggregate({
        where: {
          accountId: id,
          tipo: { in: ["CREDITO", "TRANSFERENCIA_ENTRADA", "JUROS"] }
        },
        _sum: { valor: true },
        _count: true
      }),
      
      prisma.bankTransaction.aggregate({
        where: {
          accountId: id,
          tipo: { in: ["DEBITO", "TRANSFERENCIA_SAIDA", "TAXA"] }
        },
        _sum: { valor: true },
        _count: true
      }),
      
      prisma.bankTransaction.findFirst({
        where: { accountId: id },
        orderBy: { dataTransacao: "desc" },
        select: {
          id: true,
          tipo: true,
          valor: true,
          descricao: true,
          dataTransacao: true
        }
      })
    ]);
    
    const saldoDisponivel = Number(conta.saldoAtual) + Number(conta.limiteCredito || 0);
    
    return NextResponse.json({
      success: true,
      data: {
        ...conta,
        estatisticas: {
          saldoDisponivel,
          totalCreditos: totalCreditos._sum.valor || 0,
          totalDebitos: totalDebitos._sum.valor || 0,
          quantidadeCreditos: totalCreditos._count,
          quantidadeDebitos: totalDebitos._count,
          ultimaTransacao
        }
      }
    }, { status: 200 });
    
  });

/**
 * PUT - Atualizar conta bancária
 */
export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "update")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        message: "ID inválido"
      }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Valida dados
    const validated = updateBankAccountSchema.parse(body) as UpdateBankAccountInput;
    
    // Verifica se conta existe
    const contaExistente = await prisma.bankAccount.findFirst({
      where: { id, empresaId: user.empresaId }
    });
    
    if (!contaExistente) {
      return NextResponse.json({
        success: false,
        message: "Conta não encontrada"
      }, { status: 404 });
    }
    
    // Se definir como principal, remove principal de outras contas
    if (validated.principal === true) {
      await prisma.bankAccount.updateMany({
        where: {
          empresaId: contaExistente.empresaId,
          principal: true,
          id: { not: id }
        },
        data: {
          principal: false
        }
      });
    }
    
    // Se alterou agência/conta/banco, verifica duplicação
    if (validated.banco || validated.agencia || validated.conta) {
      const dadosVerificacao = {
        banco: validated.banco || contaExistente.banco,
        agencia: validated.agencia || contaExistente.agencia,
        conta: validated.conta || contaExistente.conta
      };
      
      const duplicado = await prisma.bankAccount.findFirst({
        where: {
          empresaId: contaExistente.empresaId,
          banco: dadosVerificacao.banco,
          agencia: dadosVerificacao.agencia,
          conta: dadosVerificacao.conta,
          id: { not: id }
        }
      });
      
      if (duplicado) {
        return NextResponse.json({
          success: false,
          message: "Já existe uma conta com esses dados"
        }, { status: 409 });
      }
    }
    
    // Atualiza conta
    const contaAtualizada = await prisma.bankAccount.update({
      where: { id },
       
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: validated as any,
      include: {
        empresa: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Conta atualizada com sucesso",
      data: contaAtualizada
    }, { status: 200 });
    
  });

/**
 * DELETE - Excluir conta bancária
 */
export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "delete")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        message: "ID inválido"
      }, { status: 400 });
    }
    
    // Verifica se conta existe
    const conta = await prisma.bankAccount.findFirst({
      where: { id, empresaId: user.empresaId },
      include: {
        _count: {
          select: {
            transactions: true,
            transfersFrom: true,
            transfersTo: true
          }
        }
      }
    });
    
    if (!conta) {
      return NextResponse.json({
        success: false,
        message: "Conta não encontrada"
      }, { status: 404 });
    }
    
    // Verifica se tem transações
    const temMovimentacao = conta._count.transactions > 0 || 
                           conta._count.transfersFrom > 0 || 
                           conta._count.transfersTo > 0;
    
    if (temMovimentacao) {
      return NextResponse.json({
        success: false,
        message: "Não é possível excluir conta com movimentações. Desative-a em vez disso.",
        details: {
          transactions: conta._count.transactions,
          transfersFrom: conta._count.transfersFrom,
          transfersTo: conta._count.transfersTo
        }
      }, { status: 409 });
    }
    
    // Exclui conta
    await prisma.bankAccount.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: "Conta excluída com sucesso"
    }, { status: 200 });
    
  });
