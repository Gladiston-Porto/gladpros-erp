/**
 * API REST - FLUXO DE CAIXA
 * 
 * GET /api/financeiro/fluxo-caixa - Dashboard de fluxo de caixa com análises e projeções
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";

/**
 * GET - Obter análise completa de fluxo de caixa
 * 
 * Query params:
 * - empresaId (obrigatório)
 * - dataInicio (opcional, default: 30 dias atrás)
 * - dataFim (opcional, default: hoje)
 * - incluirProjecao (opcional, default: true)
 * - diasProjecao (opcional, default: 30)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    
     
     
    const empresaId = user.empresaId;
    const incluirProjecao = searchParams.get("incluirProjecao") !== "false";
    const diasProjecao = searchParams.get("diasProjecao") ? Number(searchParams.get("diasProjecao")) : 30;
    
    // Define período padrão (últimos 30 dias)
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    const dataFim = searchParams.get("dataFim") 
      ? new Date(searchParams.get("dataFim")!)
      : hoje;
    
    const dataInicio = searchParams.get("dataInicio")
      ? new Date(searchParams.get("dataInicio")!)
      : new Date(dataFim.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 dias atrás
    
    // Valida período
    if (dataInicio > dataFim) {
      return NextResponse.json({
        error: "Invalid date range",
        success: false,
        message: "Data inicial não pode ser maior que data final"
      }, { status: 400 });
    }
    
    const diasDiferenca = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasDiferenca > 365) {
      return NextResponse.json({
        error: "Period too large",
        success: false,
        message: "Período máximo permitido é de 365 dias"
      }, { status: 400 });
    }
    
    // ===== 1. SALDO ATUAL CONSOLIDADO =====
    const contasAtivas = await prisma.bankAccount.findMany({
      where: {
        empresaId,
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        banco: true,
        saldoAtual: true,
        limiteCredito: true
      }
    });
    
    const saldoAtualTotal = contasAtivas.reduce((sum, conta) => 
      sum + Number(conta.saldoAtual), 0
    );
    
    const limiteTotal = contasAtivas.reduce((sum, conta) => 
      sum + Number(conta.limiteCredito || 0), 0
    );
    
    const saldoDisponivelTotal = saldoAtualTotal + limiteTotal;
    
    // ===== 2. RECEITAS E DESPESAS DO PERÍODO =====
    // Limit to 1000 records per type to prevent OOM on large datasets.
    // The 365-day window cap already restricts period, but a single active
    // tenant can accumulate thousands of records per month.
    const FLUXO_CAIXA_RECORD_LIMIT = 1000;

    const [receitas, despesas] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          empresaId,
          dataVencimento: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        select: {
          id: true,
          descricao: true,
          valor: true,
          dataVencimento: true,
          dataPagamento: true,
          status: true,
          categoria: true
        },
        orderBy: {
          dataVencimento: 'asc'
        },
        take: FLUXO_CAIXA_RECORD_LIMIT,
      }),
      prisma.expense.findMany({
        where: {
          empresaId,
          dataVencimento: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        select: {
          id: true,
          descricao: true,
          valor: true,
          dataVencimento: true,
          dataPagamento: true,
          status: true,
          categoria: true
        },
        orderBy: {
          dataVencimento: 'asc'
        },
        take: FLUXO_CAIXA_RECORD_LIMIT,
      })
    ]);
    
    // Calcula totais do período
    const totalReceitasPeriodo = receitas.reduce((sum, r) => sum + Number(r.valor), 0);
    const totalDespesasPeriodo = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
    
    const totalReceitasPagas = receitas
      .filter(r => r.status === 'RECEBIDA')
      .reduce((sum, r) => sum + Number(r.valor), 0);
    
    const totalDespesasPagas = despesas
      .filter(d => d.status === 'PAGA')
      .reduce((sum, d) => sum + Number(d.valor), 0);
    
    const totalReceitasPendentes = receitas
      .filter(r => r.status === 'PENDENTE' || r.status === 'VENCIDA')
      .reduce((sum, r) => sum + Number(r.valor), 0);
    
    const totalDespesasPendentes = despesas
      .filter(d => d.status === 'PENDENTE' || d.status === 'AGUARDANDO_APROVACAO')
      .reduce((sum, d) => sum + Number(d.valor), 0);
    
    // ===== 3. EVOLUÇÃO DIÁRIA =====
    // Agrupa por data para gráfico de linha
    const evolucaoDiaria: Array<{
      data: string;
      receitas: number;
      despesas: number;
      saldo: number;
      receitasAcumuladas: number;
      despesasAcumuladas: number;
      saldoAcumulado: number;
    }> = [];
    
    let receitasAcumuladas = 0;
    let despesasAcumuladas = 0;
    
    // Itera por cada dia do período
    for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
      const diaAtual = new Date(d);
      const dataStr = diaAtual.toISOString().split('T')[0];
      
      const receitasDia = receitas
        .filter(r => {
          const dataRef = r.dataPagamento || r.dataVencimento;
          return dataRef.toISOString().split('T')[0] === dataStr;
        })
        .reduce((sum, r) => sum + Number(r.valor), 0);
      
      const despesasDia = despesas
        .filter(d => {
          const dataRef = d.dataPagamento || d.dataVencimento;
          return dataRef.toISOString().split('T')[0] === dataStr;
        })
        .reduce((sum, d) => sum + Number(d.valor), 0);
      
      receitasAcumuladas += receitasDia;
      despesasAcumuladas += despesasDia;
      
      evolucaoDiaria.push({
        data: dataStr,
        receitas: receitasDia,
        despesas: despesasDia,
        saldo: receitasDia - despesasDia,
        receitasAcumuladas,
        despesasAcumuladas,
        saldoAcumulado: receitasAcumuladas - despesasAcumuladas
      });
    }
    
    // ===== 4. CATEGORIAS - TOP 10 =====
    const categoriaReceitas: Record<string, number> = {};
    const categoriaDespesas: Record<string, number> = {};
    
    receitas.forEach(r => {
      const cat = r.categoria?.nome || 'Sem categoria';
      categoriaReceitas[cat] = (categoriaReceitas[cat] || 0) + Number(r.valor);
    });
    
    despesas.forEach(d => {
      const cat = d.categoria?.nome || 'Sem categoria';
      categoriaDespesas[cat] = (categoriaDespesas[cat] || 0) + Number(d.valor);
    });
    
    const topReceitasPorCategoria = Object.entries(categoriaReceitas)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    const topDespesasPorCategoria = Object.entries(categoriaDespesas)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    // ===== 5. PROJEÇÕES (se solicitado) =====
    let projecoes = null;
    
    if (incluirProjecao) {
      // Busca receitas e despesas recorrentes
      const [receitasRecorrentes, despesasRecorrentes] = await Promise.all([
        prisma.revenueRecurrence.findMany({
          where: {
            ativo: true,
            receita: { empresaId }
          },
          select: {
            id: true,
            frequencia: true,
            diaVencimento: true,
            receita: { select: { descricao: true, valor: true } }
          }
        }),
        prisma.expenseRecurrence.findMany({
          where: {
            ativo: true,
            despesa: { empresaId }
          },
          select: {
            id: true,
            frequencia: true,
            diaVencimento: true,
            despesa: { select: { descricao: true, valor: true } }
          }
        })
      ]);
      
      // Calcula projeção para os próximos X dias
      const dataProjecaoInicio = new Date(dataFim);
      dataProjecaoInicio.setDate(dataProjecaoInicio.getDate() + 1);
      
      const dataProjecaoFim = new Date(dataProjecaoInicio);
      dataProjecaoFim.setDate(dataProjecaoFim.getDate() + diasProjecao);
      
      const projecaoDiaria: Array<{
        data: string;
        receitasProjetadas: number;
        despesasProjetadas: number;
        saldoProjetado: number;
        receitasAcumuladas: number;
        despesasAcumuladas: number;
        saldoAcumulado: number;
      }> = [];
      
      let receitasProjetadasAcum = 0;
      let despesasProjetadasAcum = 0;
      
      for (let d = new Date(dataProjecaoInicio); d <= dataProjecaoFim; d.setDate(d.getDate() + 1)) {
        const diaAtual = new Date(d);
        const dataStr = diaAtual.toISOString().split('T')[0];
        const dia = diaAtual.getDate();
        const diaSemana = diaAtual.getDay(); // 0 = Domingo, 6 = Sábado
        
        let receitasDia = 0;
        let despesasDia = 0;
        
        // Projeta receitas recorrentes
        receitasRecorrentes.forEach(rec => {
          let incluir = false;
          
          switch (rec.frequencia) {
            case 'SEMANAL':
              incluir = diaSemana === (rec.diaVencimento || 1); // Default segunda
              break;
            case 'QUINZENAL':
              incluir = dia === (rec.diaVencimento || 1) || dia === ((rec.diaVencimento || 1) + 15);
              break;
            case 'MENSAL':
              incluir = dia === (rec.diaVencimento || 1);
              break;
            case 'BIMESTRAL':
              // Simplificado: considera apenas o dia
              incluir = dia === (rec.diaVencimento || 1);
              break;
            case 'TRIMESTRAL':
              incluir = dia === (rec.diaVencimento || 1);
              break;
            case 'SEMESTRAL':
              incluir = dia === (rec.diaVencimento || 1);
              break;
            case 'ANUAL':
              incluir = dia === (rec.diaVencimento || 1);
              break;
          }
          
          if (incluir) {
            receitasDia += Number(rec.receita?.valor || 0);
          }
        });
        
        // Projeta despesas recorrentes
        despesasRecorrentes.forEach(desp => {
          let incluir = false;
          
          switch (desp.frequencia) {
            case 'SEMANAL':
              incluir = diaSemana === (desp.diaVencimento || 1);
              break;
            case 'QUINZENAL':
              incluir = dia === (desp.diaVencimento || 1) || dia === ((desp.diaVencimento || 1) + 15);
              break;
            case 'MENSAL':
              incluir = dia === (desp.diaVencimento || 1);
              break;
            case 'BIMESTRAL':
              incluir = dia === (desp.diaVencimento || 1);
              break;
            case 'TRIMESTRAL':
              incluir = dia === (desp.diaVencimento || 1);
              break;
            case 'SEMESTRAL':
              incluir = dia === (desp.diaVencimento || 1);
              break;
            case 'ANUAL':
              incluir = dia === (desp.diaVencimento || 1);
              break;
          }
          
          if (incluir) {
            despesasDia += Number(desp.despesa?.valor || 0);
          }
        });
        
        receitasProjetadasAcum += receitasDia;
        despesasProjetadasAcum += despesasDia;
        
        projecaoDiaria.push({
          data: dataStr,
          receitasProjetadas: receitasDia,
          despesasProjetadas: despesasDia,
          saldoProjetado: receitasDia - despesasDia,
          receitasAcumuladas: receitasProjetadasAcum,
          despesasAcumuladas: despesasProjetadasAcum,
          saldoAcumulado: receitasProjetadasAcum - despesasProjetadasAcum
        });
      }
      
      // Calcula saldo projetado final
      const saldoProjetadoFinal = saldoAtualTotal + receitasProjetadasAcum - despesasProjetadasAcum;
      
      projecoes = {
        periodoProjecao: {
          dataInicio: dataProjecaoInicio.toISOString().split('T')[0],
          dataFim: dataProjecaoFim.toISOString().split('T')[0],
          dias: diasProjecao
        },
        totaisProjetados: {
          receitas: receitasProjetadasAcum,
          despesas: despesasProjetadasAcum,
          saldoFinal: saldoProjetadoFinal
        },
        evolucaoProjetada: projecaoDiaria,
        fonteDados: {
          receitasRecorrentes: receitasRecorrentes.length,
          despesasRecorrentes: despesasRecorrentes.length
        }
      };
    }
    
    // ===== 6. ALERTAS =====
    const alertas = [];
    
    // Alerta: Saldo negativo
    if (saldoAtualTotal < 0) {
      alertas.push({
        tipo: 'CRITICO',
        categoria: 'SALDO_NEGATIVO',
        mensagem: `Saldo total negativo: $ ${saldoAtualTotal.toFixed(2)}`,
        valor: saldoAtualTotal
      });
    }
    
    // Alerta: Contas individuais negativas
    const contasNegativas = contasAtivas.filter(c => Number(c.saldoAtual) < 0);
    if (contasNegativas.length > 0) {
      alertas.push({
        tipo: 'ATENCAO',
        categoria: 'CONTAS_NEGATIVAS',
        mensagem: `${contasNegativas.length} conta(s) com saldo negativo`,
        detalhes: contasNegativas.map(c => ({
          conta: c.nome,
          banco: c.banco,
          saldo: Number(c.saldoAtual)
        }))
      });
    }
    
    // Alerta: Despesas vencidas não pagas
    const despesasVencidas = despesas.filter(d => 
      d.status === 'PENDENTE' && d.dataVencimento < hoje
    );
    
    if (despesasVencidas.length > 0) {
      const totalVencido = despesasVencidas.reduce((sum, d) => sum + Number(d.valor), 0);
      alertas.push({
        tipo: 'URGENTE',
        categoria: 'DESPESAS_VENCIDAS',
        mensagem: `${despesasVencidas.length} despesa(s) vencida(s) - Total: $ ${totalVencido.toFixed(2)}`,
        quantidade: despesasVencidas.length,
        valor: totalVencido
      });
    }
    
    // Alerta: Receitas atrasadas
    const receitasAtrasadas = receitas.filter(r => 
      r.status === 'PENDENTE' && r.dataVencimento < hoje
    );
    
    if (receitasAtrasadas.length > 0) {
      const totalAtrasado = receitasAtrasadas.reduce((sum, r) => sum + Number(r.valor), 0);
      alertas.push({
        tipo: 'ATENCAO',
        categoria: 'RECEITAS_ATRASADAS',
        mensagem: `${receitasAtrasadas.length} receita(s) atrasada(s) - Total: $ ${totalAtrasado.toFixed(2)}`,
        quantidade: receitasAtrasadas.length,
        valor: totalAtrasado
      });
    }
    
    // Alerta: Projeção de saldo negativo
    if (projecoes && projecoes.totaisProjetados.saldoFinal < 0) {
      alertas.push({
        tipo: 'CRITICO',
        categoria: 'PROJECAO_NEGATIVA',
        mensagem: `Projeção de saldo negativo em ${diasProjecao} dias: $ ${projecoes.totaisProjetados.saldoFinal.toFixed(2)}`,
        diasProjecao,
        saldoProjetado: projecoes.totaisProjetados.saldoFinal
      });
    }
    
    // ===== 7. KPIs =====
    const kpis = {
      saldoAtual: saldoAtualTotal,
      saldoDisponivel: saldoDisponivelTotal,
      receitasPeriodo: {
        total: totalReceitasPeriodo,
        pagas: totalReceitasPagas,
        pendentes: totalReceitasPendentes,
        percentualRecebido: totalReceitasPeriodo > 0 
          ? (totalReceitasPagas / totalReceitasPeriodo) * 100 
          : 0
      },
      despesasPeriodo: {
        total: totalDespesasPeriodo,
        pagas: totalDespesasPagas,
        pendentes: totalDespesasPendentes,
        percentualPago: totalDespesasPeriodo > 0 
          ? (totalDespesasPagas / totalDespesasPeriodo) * 100 
          : 0
      },
      resultadoPeriodo: totalReceitasPeriodo - totalDespesasPeriodo,
      resultadoRealizado: totalReceitasPagas - totalDespesasPagas,
      margemLiquida: totalReceitasPeriodo > 0
        ? ((totalReceitasPeriodo - totalDespesasPeriodo) / totalReceitasPeriodo) * 100
        : 0,
      burnRate: diasDiferenca > 0 
        ? totalDespesasPagas / diasDiferenca 
        : 0, // Média de gastos por dia
      runway: saldoAtualTotal > 0 && (totalDespesasPagas / diasDiferenca) > 0
        ? Math.floor(saldoAtualTotal / (totalDespesasPagas / diasDiferenca))
        : null // Dias até saldo zero no ritmo atual
    };
    
    // ===== RESPOSTA FINAL =====
    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          dataInicio: dataInicio.toISOString().split('T')[0],
          dataFim: dataFim.toISOString().split('T')[0],
          dias: diasDiferenca
        },
        kpis,
        evolucaoDiaria,
        categorias: {
          receitas: topReceitasPorCategoria,
          despesas: topDespesasPorCategoria
        },
        projecoes,
        alertas,
        metadados: {
          contas: contasAtivas.length,
          receitas: receitas.length,
          despesas: despesas.length,
          truncated: receitas.length >= FLUXO_CAIXA_RECORD_LIMIT || despesas.length >= FLUXO_CAIXA_RECORD_LIMIT,
          geradoEm: new Date().toISOString()
        }
      }
    }, { status: 200 });
    
  });
