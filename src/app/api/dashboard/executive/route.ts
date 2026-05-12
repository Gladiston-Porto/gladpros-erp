// src/app/api/dashboard/executive/route.ts
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Projeto_status } from '@prisma/client';
import { withErrorHandler } from '@/lib/api/error-handler';
import { withBusinessCache } from '@/shared/lib/cache/business-cache';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { apiRateLimit } from '@/shared/lib/rate-limit';

/** Generates the last `count` month labels (e.g. "Jan '25") */
function buildMonthLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'America/Chicago' }));
  }
  return labels;
}

function groupByMonth<T extends { criadoEm: Date }>(
  items: T[],
  labels: string[],
  getValue: (item: T) => number = () => 1,
): number[] {
  const buckets: Record<string, number> = {};
  for (const item of items) {
    const key = new Date(item.criadoEm).toLocaleString('en-US', {
      month: 'short', year: '2-digit', timeZone: 'America/Chicago',
    });
    buckets[key] = (buckets[key] || 0) + getValue(item);
  }
  return labels.map(l => buckets[l] ?? 0);
}

export const GET = withErrorHandler(async (request: Request) => {
    const user = await requireUser(request as NextRequest);
    if (!can(user.role as Role, 'dashboard', 'read')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 }
      );
    }

    const rateCheck = await apiRateLimit.isAllowed(request as NextRequest);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: rateCheck.message, success: false },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const cacheKey = `dashboard_executive:${String(user.role).toUpperCase()}:${period}`;
    const cacheTtlSeconds = process.env.NODE_ENV === 'production' ? 120 : 30;

    const response = await withBusinessCache(
      cacheKey,
      async () => {
        const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        // previousStartDate é cálculo puro — pode ser computado antes do Promise.all
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - daysAgo);

        // Chart: últimos 6 meses (independente do período selecionado)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Buscar TODOS os dados em paralelo — período atual + período anterior juntos
        const [
          receitas,
          despesas,
          contasBancarias,
          materiais,
          saldosEstoque,
          movimentacoesEstoque,
          projetos,
          activeWorkers,
          clientes,
          propostas,
          invoices,
          previousReceitas,
           
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          previousDespesas,
          revenueItems,
          propostaItems,
          clienteItems,
        ] = await Promise.all([
          prisma.revenue.aggregate({
            _sum: { valor: true },
            _count: true,
            where: { criadoEm: { gte: startDate } }
          }),
          prisma.expense.aggregate({
            _sum: { valor: true },
            _count: true,
            where: { criadoEm: { gte: startDate } }
          }),
          prisma.bankAccount.aggregate({
            _sum: { saldoAtual: true },
            _count: true,
            where: { ativo: true }
          }),
          prisma.material.aggregate({ _count: true }),
          prisma.materialSaldo.aggregate({ _sum: { quantidade: true } }),
          prisma.materialMovimentacao.count({
            where: { criadoEm: { gte: startDate } }
          }),
          prisma.projeto.findMany({
            where: {
              status: {
                in: [
                  Projeto_status.em_execucao,
                  Projeto_status.planejado,
                  Projeto_status.em_inspecao,
                  Projeto_status.aguardando_devolucoes
                ]
              }
            },
            select: {
              id: true,
              titulo: true,
              status: true,
              prioridade: true,
              dataInicioPrevista: true,
              dataConclusaoPrevista: true,
              valorEstimado: true,
              custoReal: true
            },
            take: 10,
            orderBy: { dataInicioPrevista: 'desc' }
          }),
          prisma.worker.count({ where: { status: 'ACTIVE' } }),
          prisma.cliente.aggregate({
            _count: true,
            where: { ativo: true }
          }),
          prisma.proposta.groupBy({
            by: ['status'],
            _count: true
          }),
          prisma.invoice.aggregate({
            _count: true,
            _sum: { valorTotal: true },
            where: { criadoEm: { gte: startDate } }
          }),
          // Período anterior — junto com o resto para evitar round-trip extra
          prisma.revenue.aggregate({
            _sum: { valor: true },
            where: { criadoEm: { gte: previousStartDate, lt: startDate } }
          }),
          prisma.expense.aggregate({
            _sum: { valor: true },
            where: { criadoEm: { gte: previousStartDate, lt: startDate } }
          }),
          // Chart time-series: receita mensal (últimos 6 meses)
          prisma.revenue.findMany({
            where: { criadoEm: { gte: sixMonthsAgo } },
            select: { criadoEm: true, valor: true },
            orderBy: { criadoEm: 'asc' },
          }),
          // Chart time-series: propostas mensais (últimos 6 meses)
          prisma.proposta.findMany({
            where: { criadoEm: { gte: sixMonthsAgo } },
            select: { criadoEm: true },
            orderBy: { criadoEm: 'asc' },
          }),
          // Chart time-series: novos clientes mensais (últimos 6 meses)
          prisma.cliente.findMany({
            where: { criadoEm: { gte: sixMonthsAgo } },
            select: { criadoEm: true },
            orderBy: { criadoEm: 'asc' },
          }),
        ]);

        // Calcular saldo financeiro
        const totalReceitas = Number(receitas._sum.valor || 0);
        const totalDespesas = Number(despesas._sum.valor || 0);
        const saldoContas = Number(contasBancarias._sum.saldoAtual || 0);
        const saldoPeriodo = totalReceitas - totalDespesas;

        // Calcular health score dos projetos
        const agora = new Date();
        const projetosComAtraso = projetos.filter(p => {
          if (!p.dataConclusaoPrevista) return false;
          return p.dataConclusaoPrevista < agora && p.status !== Projeto_status.concluido;
        }).length;

        const projetosSobreOrcamento = projetos.filter(p => {
          if (!p.valorEstimado || !p.custoReal) return false;
          return Number(p.custoReal) > Number(p.valorEstimado);
        }).length;

        const projetosPayload = projetos.map((p) => {
          const orcamento = p.valorEstimado ? Number(p.valorEstimado) : null;
          const custoAtual = p.custoReal ? Number(p.custoReal) : null;

          return {
            id: p.id.toString(),
            nome: p.titulo,
            status: p.status,
            prioridade: p.prioridade,
            dataInicio: p.dataInicioPrevista,
            dataFim: p.dataConclusaoPrevista,
            orcamento,
            custoAtual,
            health: custoAtual !== null && orcamento !== null ? (custoAtual > orcamento ? 'critical' : 'good') : 'neutral'
          };
        });

        // Consolidar status das propostas
        const propostasStats = {
          total: propostas.reduce((acc, p) => acc + p._count, 0),
          rascunho: propostas.find(p => p.status === 'RASCUNHO')?._count || 0,
          enviada: propostas.find(p => p.status === 'ENVIADA')?._count || 0,
          aprovada: propostas.find(p => p.status === 'APROVADA')?._count || 0,
          cancelada: propostas.find(p => p.status === 'CANCELADA')?._count || 0,
        };

        const previousTotalReceitas = Number(previousReceitas._sum.valor || 0);
        const crescimentoReceita = previousTotalReceitas > 0 
          ? ((totalReceitas - previousTotalReceitas) / previousTotalReceitas) * 100 
          : 0;

        // Build chart time-series (last 6 months)
        const monthLabels = buildMonthLabels(6);
        const chartData = {
          labels: monthLabels,
          revenue: groupByMonth(revenueItems, monthLabels, (r) => Number(r.valor || 0)),
          proposals: groupByMonth(propostaItems, monthLabels),
          clients: groupByMonth(clienteItems, monthLabels),
        };

        return {
          period,
          kpis: {
            receitaTotal: Number(totalReceitas),
            despesaTotal: Number(totalDespesas),
            saldoPeriodo: Number(saldoPeriodo),
            saldoContas: Number(saldoContas),
            crescimentoReceita: Number(crescimentoReceita),
            projetosAtivos: projetos.length,
            projetosAtrasados: projetosComAtraso,
            projetosSobreOrcamento,
            workersAtivos: activeWorkers,
            clientesAtivos: clientes._count,
            propostasTotal: propostasStats.total,
            propostasAprovadas: propostasStats.aprovada,
            propostasPendentes: propostasStats.enviada,
            produtosTotal: materiais._count,
            estoqueTotal: Number(saldosEstoque._sum.quantidade || 0),
            movimentacoesRecentes: movimentacoesEstoque,
            invoicesTotal: invoices._count,
            invoicesFaturamento: Number(invoices._sum.valorTotal || 0),
          },
          projetos: projetosPayload,
          alertas: [
            ...(projetosComAtraso > 0 ? [{
              tipo: 'projeto',
              severidade: 'high' as const,
              mensagem: `${projetosComAtraso} projeto(s) atrasado(s)`,
              count: projetosComAtraso
            }] : []),
            ...(projetosSobreOrcamento > 0 ? [{
              tipo: 'projeto',
              severidade: 'medium' as const,
              mensagem: `${projetosSobreOrcamento} projeto(s) sobre orçamento`,
              count: projetosSobreOrcamento
            }] : []),
            ...(saldoPeriodo < 0 ? [{
              tipo: 'financeiro',
              severidade: 'high' as const,
              mensagem: 'Saldo negativo no período',
              valor: Number(saldoPeriodo)
            }] : [])
          ]
          ,
          chartData,
        };
      },
      { ttlSeconds: cacheTtlSeconds }
    );

    return NextResponse.json(
      { data: response, success: true },
      { status: 200, headers: { 'Cache-Control': 'no-store, private' } }
    );
    
  });

