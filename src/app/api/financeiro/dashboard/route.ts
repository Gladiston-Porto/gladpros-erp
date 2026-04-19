/**
 * API REST - DASHBOARD FINANCEIRO
 * 
 * GET /api/financeiro/dashboard - Obter resumo financeiro consolidado
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";

/**
 * GET - Obter dashboard financeiro com resumo de contas e transações
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    
    const empresaId = (user as any).empresaId ?? 1;
    
    // Define período (padrão: últimos 30 dias)
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    // Se período especificado via query params
    if (searchParams.get("dataInicio")) {
      dataInicio.setTime(new Date(searchParams.get("dataInicio")!).getTime());
    }
    
    if (searchParams.get("dataFim")) {
      dataFim.setTime(new Date(searchParams.get("dataFim")!).getTime());
    }
    
    // Busca dados consolidados
    const [
      contas,
      totalContas,
      transacoesPeriodo,
      transferencias,
      transacoesNaoReconciliadas,
      transacoesPorTipo,
      transacoesPorCategoria
    ] = await Promise.all([
      // Contas ativas com saldos
      prisma.bankAccount.findMany({
        where: {
          empresaId,
          ativo: true
        },
        select: {
          id: true,
          nome: true,
          banco: true,
          tipo: true,
          saldoAtual: true,
          limiteCredito: true,
          principal: true,
          ultimaConciliacao: true
        },
        orderBy: [
          { principal: "desc" },
          { saldoAtual: "desc" }
        ]
      }),
      
      // Totais gerais
      prisma.bankAccount.aggregate({
        where: {
          empresaId,
          ativo: true
        },
        _sum: {
          saldoAtual: true,
          limiteCredito: true
        },
        _count: true
      }),
      
      // Transações do período
      prisma.bankTransaction.findMany({
        where: {
          empresaId,
          dataTransacao: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        select: {
          tipo: true,
          valor: true,
          dataTransacao: true
        }
      }),
      
      // Transferências do período
      prisma.bankTransfer.groupBy({
        by: ["status"],
        where: {
          empresaId,
          dataAgendamento: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        _sum: {
          valor: true
        },
        _count: true
      }),
      
      // Transações não reconciliadas
      prisma.bankTransaction.aggregate({
        where: {
          empresaId,
          reconciliada: false
        },
        _sum: {
          valor: true
        },
        _count: true
      }),
      
      // Agregação por tipo de transação
      prisma.bankTransaction.groupBy({
        by: ["tipo"],
        where: {
          empresaId,
          dataTransacao: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        _sum: {
          valor: true
        },
        _count: true
      }),
      
      // Top categorias
      prisma.bankTransaction.groupBy({
        by: ["categoria"],
        where: {
          empresaId,
          dataTransacao: {
            gte: dataInicio,
            lte: dataFim
          },
          categoria: { not: null }
        },
        _sum: {
          valor: true
        },
        _count: true,
        orderBy: {
          _sum: {
            valor: "desc"
          }
        },
        take: 10
      })
    ]);
    
    // Processa resumo por tipo
    const resumoPorTipo = transacoesPorTipo.reduce((acc: any, item) => {
      acc[item.tipo] = {
        total: Number(item._sum.valor) || 0,
        quantidade: item._count
      };
      return acc;
    }, {});
    
    // Calcula totais de créditos e débitos
    const totalCreditos = transacoesPorTipo
      .filter(t => ["CREDITO", "TRANSFERENCIA_ENTRADA", "JUROS"].includes(t.tipo))
      .reduce((sum, t) => sum + (Number(t._sum.valor) || 0), 0);
    
    const totalDebitos = transacoesPorTipo
      .filter(t => ["DEBITO", "TRANSFERENCIA_SAIDA", "TAXA"].includes(t.tipo))
      .reduce((sum, t) => sum + (Number(t._sum.valor) || 0), 0);
    
    const saldoPeriodo = totalCreditos - totalDebitos;
    
    // Calcula saldo total disponível (saldo + limites)
    const saldoTotal = Number(totalContas._sum.saldoAtual) || 0;
    const limitesTotal = Number(totalContas._sum.limiteCredito) || 0;
    const saldoDisponivel = saldoTotal + limitesTotal;
    
    // Resumo de transferências por status
    const transferenciasPorStatus = transferencias.reduce((acc: any, t) => {
      acc[t.status] = {
        total: Number(t._sum.valor) || 0,
        quantidade: t._count
      };
      return acc;
    }, {});
    
    // Evolução diária (últimos 7 dias)
    const ultimosSete = new Date();
    ultimosSete.setDate(ultimosSete.getDate() - 7);
    
    const evolucaoDiaria = await prisma.$queryRaw<Array<{
      data: Date;
      creditos: number;
      debitos: number;
      saldo: number;
    }>>`
      SELECT 
        DATE(dataTransacao) as data,
        SUM(CASE WHEN tipo IN ('CREDITO', 'TRANSFERENCIA_ENTRADA', 'JUROS') THEN valor ELSE 0 END) as creditos,
        SUM(CASE WHEN tipo IN ('DEBITO', 'TRANSFERENCIA_SAIDA', 'TAXA') THEN valor ELSE 0 END) as debitos,
        SUM(CASE 
          WHEN tipo IN ('CREDITO', 'TRANSFERENCIA_ENTRADA', 'JUROS') THEN valor 
          ELSE -valor 
        END) as saldo
      FROM bank_transactions
      WHERE empresaId = ${empresaId}
        AND dataTransacao >= ${ultimosSete}
      GROUP BY DATE(dataTransacao)
      ORDER BY data ASC
    `;
    
    // Contas que precisam reconciliação (mais de 7 dias sem reconciliar)
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    
    const contasPendentesConciliacao = contas.filter(c => 
      !c.ultimaConciliacao || c.ultimaConciliacao < seteDiasAtras
    );
    
    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio: dataInicio,
          fim: dataFim
        },
        resumo: {
          saldoTotal,
          limitesTotal,
          saldoDisponivel,
          totalContas: totalContas._count,
          totalCreditos,
          totalDebitos,
          saldoPeriodo,
          transacoesNaoReconciliadas: {
            quantidade: transacoesNaoReconciliadas._count,
            valor: Number(transacoesNaoReconciliadas._sum.valor) || 0
          }
        },
        contas: contas.map(c => ({
          ...c,
          saldoDisponivel: Number(c.saldoAtual) + (Number(c.limiteCredito) || 0),
          precisaConciliacao: !c.ultimaConciliacao || c.ultimaConciliacao < seteDiasAtras
        })),
        transacoesPorTipo: resumoPorTipo,
        transferenciasPorStatus,
        topCategorias: transacoesPorCategoria.map(c => ({
          categoria: c.categoria,
          total: Number(c._sum.valor) || 0,
          quantidade: c._count
        })),
        evolucaoDiaria: evolucaoDiaria.map(e => ({
          data: e.data,
          creditos: Number(e.creditos),
          debitos: Number(e.debitos),
          saldo: Number(e.saldo)
        })),
        alertas: {
          contasPendentesConciliacao: contasPendentesConciliacao.length,
          transacoesNaoReconciliadas: transacoesNaoReconciliadas._count
        }
      }
    }, { status: 200 });
    
  });
