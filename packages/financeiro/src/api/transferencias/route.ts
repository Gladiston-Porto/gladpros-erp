/**
 * API REST - TRANSFERÊNCIAS BANCÁRIAS
 * 
 * GET /api/financeiro/transferencias - Listar transferências
 * POST /api/financeiro/transferencias - Criar nova transferência
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createBankTransferSchema,
  bankTransferFiltersSchema,
  validarSaldoDisponivel,
  calcularSaldoPosterior,
  type CreateBankTransferInput
} from "@/schemas/bank-account.schema";

/**
 * GET - Listar transferências com filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filtros
    const filters = {
      empresaId: searchParams.get("empresaId") ? Number(searchParams.get("empresaId")) : undefined,
      fromAccountId: searchParams.get("fromAccountId") ? Number(searchParams.get("fromAccountId")) : undefined,
      toAccountId: searchParams.get("toAccountId") ? Number(searchParams.get("toAccountId")) : undefined,
      status: searchParams.get("status") || undefined,
      dataInicio: searchParams.get("dataInicio") ? new Date(searchParams.get("dataInicio")!) : undefined,
      dataFim: searchParams.get("dataFim") ? new Date(searchParams.get("dataFim")!) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50
    };
    
    const validatedFilters = bankTransferFiltersSchema.parse(filters);
    
    // Build where clause
    const where: any = {};
    
    if (validatedFilters.empresaId) {
      where.empresaId = validatedFilters.empresaId;
    }
    
    if (validatedFilters.fromAccountId) {
      where.fromAccountId = validatedFilters.fromAccountId;
    }
    
    if (validatedFilters.toAccountId) {
      where.toAccountId = validatedFilters.toAccountId;
    }
    
    if (validatedFilters.status) {
      where.status = validatedFilters.status;
    }
    
    if (validatedFilters.dataInicio || validatedFilters.dataFim) {
      where.dataAgendamento = {};
      
      if (validatedFilters.dataInicio) {
        where.dataAgendamento.gte = validatedFilters.dataInicio;
      }
      
      if (validatedFilters.dataFim) {
        where.dataAgendamento.lte = validatedFilters.dataFim;
      }
    }
    
    // Calcula paginação
    const skip = (validatedFilters.page - 1) * validatedFilters.limit;
    
    // Busca transferências
    const [transferencias, total] = await Promise.all([
      prisma.bankTransfer.findMany({
        where,
        include: {
          fromAccount: {
            select: {
              id: true,
              nome: true,
              banco: true,
              agencia: true,
              conta: true
            }
          },
          toAccount: {
            select: {
              id: true,
              nome: true,
              banco: true,
              agencia: true,
              conta: true
            }
          },
          empresa: {
            select: {
              id: true,
              nome: true
            }
          },
          _count: {
            select: {
              transactions: true
            }
          }
        },
        orderBy: [
          { dataAgendamento: "desc" },
          { id: "desc" }
        ],
        skip,
        take: validatedFilters.limit
      }),
      
      prisma.bankTransfer.count({ where })
    ]);
    
    return NextResponse.json({
      success: true,
      data: transferencias,
      pagination: {
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        total,
        totalPages: Math.ceil(total / validatedFilters.limit)
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Erro ao listar transferências:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json({
        success: false,
        message: "Erro de validação",
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: "Erro ao listar transferências",
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST - Criar nova transferência
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Valida dados
    const validated = createBankTransferSchema.parse(body) as CreateBankTransferInput;
    
    // Busca contas de origem e destino
    const [fromAccount, toAccount] = await Promise.all([
      prisma.bankAccount.findUnique({
        where: { id: validated.fromAccountId },
        select: {
          id: true,
          empresaId: true,
          nome: true,
          banco: true,
          saldoAtual: true,
          limiteCredito: true,
          ativo: true
        }
      }),
      
      prisma.bankAccount.findUnique({
        where: { id: validated.toAccountId },
        select: {
          id: true,
          empresaId: true,
          nome: true,
          banco: true,
          saldoAtual: true,
          ativo: true
        }
      })
    ]);
    
    // Valida conta de origem
    if (!fromAccount) {
      return NextResponse.json({
        success: false,
        message: "Conta de origem não encontrada"
      }, { status: 404 });
    }
    
    if (!fromAccount.ativo) {
      return NextResponse.json({
        success: false,
        message: "Conta de origem está inativa"
      }, { status: 400 });
    }
    
    if (fromAccount.empresaId !== validated.empresaId) {
      return NextResponse.json({
        success: false,
        message: "Conta de origem pertence a outra empresa"
      }, { status: 400 });
    }
    
    // Valida conta de destino
    if (!toAccount) {
      return NextResponse.json({
        success: false,
        message: "Conta de destino não encontrada"
      }, { status: 404 });
    }
    
    if (!toAccount.ativo) {
      return NextResponse.json({
        success: false,
        message: "Conta de destino está inativa"
      }, { status: 400 });
    }
    
    if (toAccount.empresaId !== validated.empresaId) {
      return NextResponse.json({
        success: false,
        message: "Conta de destino pertence a outra empresa"
      }, { status: 400 });
    }
    
    // Valida saldo disponível
    const validacaoSaldo = validarSaldoDisponivel(
      Number(fromAccount.saldoAtual),
      fromAccount.limiteCredito ? Number(fromAccount.limiteCredito) : null,
      validated.valor,
      "TRANSFERENCIA_SAIDA"
    );
    
    if (!validacaoSaldo.valido) {
      return NextResponse.json({
        success: false,
        message: validacaoSaldo.mensagem
      }, { status: 400 });
    }
    
    // Cria transferência e transações em uma única transação do banco
    const resultado = await prisma.$transaction(async (tx) => {
      // Cria registro de transferência
      const transferencia = await tx.bankTransfer.create({
        data: {
          empresaId: validated.empresaId,
          fromAccountId: validated.fromAccountId,
          toAccountId: validated.toAccountId,
          valor: validated.valor,
          descricao: validated.descricao,
          status: "PROCESSANDO",
          dataAgendamento: validated.dataAgendamento || new Date(),
          observacoes: validated.observacoes,
          metadata: validated.metadata ?? undefined,
          tentativas: 1
        }
      });
      
      // Calcula novos saldos
      const novoSaldoOrigem = calcularSaldoPosterior(
        Number(fromAccount.saldoAtual),
        validated.valor,
        "TRANSFERENCIA_SAIDA"
      );
      
      const novoSaldoDestino = calcularSaldoPosterior(
        Number(toAccount.saldoAtual),
        validated.valor,
        "TRANSFERENCIA_ENTRADA"
      );
      
      // Cria transação de saída
      const transacaoSaida = await tx.bankTransaction.create({
        data: {
          accountId: validated.fromAccountId,
          empresaId: validated.empresaId,
          tipo: "TRANSFERENCIA_SAIDA",
          categoria: "Transferência",
          valor: validated.valor,
          descricao: `Transferência para ${toAccount.nome}`,
          documento: `TRF-${transferencia.id}`,
          dataTransacao: new Date(),
          saldoAnterior: Number(fromAccount.saldoAtual),
          saldoPosterior: novoSaldoOrigem,
          transferId: transferencia.id,
          reconciliada: true,
          dataReconciliacao: new Date()
        }
      });
      
      // Cria transação de entrada
      const transacaoEntrada = await tx.bankTransaction.create({
        data: {
          accountId: validated.toAccountId,
          empresaId: validated.empresaId,
          tipo: "TRANSFERENCIA_ENTRADA",
          categoria: "Transferência",
          valor: validated.valor,
          descricao: `Transferência de ${fromAccount.nome}`,
          documento: `TRF-${transferencia.id}`,
          dataTransacao: new Date(),
          saldoAnterior: Number(toAccount.saldoAtual),
          saldoPosterior: novoSaldoDestino,
          transferId: transferencia.id,
          reconciliada: true,
          dataReconciliacao: new Date()
        }
      });
      
      // Atualiza saldos das contas
      await tx.bankAccount.update({
        where: { id: validated.fromAccountId },
        data: { saldoAtual: novoSaldoOrigem }
      });
      
      await tx.bankAccount.update({
        where: { id: validated.toAccountId },
        data: { saldoAtual: novoSaldoDestino }
      });
      
      // Atualiza status da transferência
      const transferenciaFinal = await tx.bankTransfer.update({
        where: { id: transferencia.id },
        data: {
          status: "CONCLUIDA",
          dataExecucao: new Date(),
          dataConclusao: new Date(),
          ultimaResposta: "Transferência realizada com sucesso"
        },
        include: {
          fromAccount: {
            select: {
              id: true,
              nome: true,
              banco: true,
              saldoAtual: true
            }
          },
          toAccount: {
            select: {
              id: true,
              nome: true,
              banco: true,
              saldoAtual: true
            }
          },
          transactions: true
        }
      });
      
      return transferenciaFinal;
    });
    
    return NextResponse.json({
      success: true,
      message: "Transferência realizada com sucesso",
      data: resultado
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Erro ao criar transferência:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json({
        success: false,
        message: "Erro de validação",
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: "Erro ao criar transferência",
      error: error.message
    }, { status: 500 });
  }
}
