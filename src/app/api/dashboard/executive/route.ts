// src/app/api/dashboard/executive/route.ts
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Projeto_status } from '@prisma/client';
import { withErrorHandler } from '@/lib/api/error-handler';
import { withBusinessCache } from '@/shared/lib/cache/business-cache';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { z } from 'zod';

/** Generates the last `count` month labels (e.g. "Jan '25") */
function buildMonthLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(
      d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'America/Chicago' }),
    );
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
      month: 'short',
      year: '2-digit',
      timeZone: 'America/Chicago',
    });
    buckets[key] = (buckets[key] || 0) + getValue(item);
  }
  return labels.map((l) => buckets[l] ?? 0);
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'dashboard', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  const rateCheck = await apiRateLimit.isAllowed(request);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: rateCheck.message, success: false },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const periodSchema = z.enum(['7d', '30d', '90d']);
  const periodResult = periodSchema.safeParse(searchParams.get('period') ?? '30d');
  if (!periodResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Parâmetro "period" inválido', success: false },
      { status: 400 },
    );
  }
  const period = periodResult.data;
  const canReadFinancial = can(user.role as Role, 'financeiro', 'read');

  const cacheKey = `dashboard_executive:${user.empresaId}:${String(user.role).toUpperCase()}:${canReadFinancial ? 'finance' : 'restricted'}:${period}`;
  const cacheTtlSeconds = process.env.NODE_ENV === 'production' ? 120 : 30;

  const response = await withBusinessCache(
    cacheKey,
    async () => {
      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const activeProjectStatuses: Projeto_status[] = [
        Projeto_status.em_execucao,
        Projeto_status.planejado,
        Projeto_status.em_inspecao,
        Projeto_status.aguardando_devolucoes,
      ];

      // previousStartDate é cálculo puro — pode ser computado antes do Promise.all
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysAgo);

      // Chart: últimos 6 meses (independente do período selecionado)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Buscar dados em paralelo — período atual + período anterior juntos
      const [
        receitas,
        despesas,
        contasBancarias,
        materiais,
        saldosEstoque,
        movimentacoesEstoque,
        projetosList,
        projetosAtivos,
        projetosComAtraso,
        projetosSobreOrcamento,
        activeWorkers,
        clientes,
        propostas,
        invoices,
        previousReceitas,
        revenueItems,
        propostaItems,
        clienteItems,
      ] = await Promise.all([
        canReadFinancial
          ? prisma.revenue.aggregate({
              _sum: { valor: true },
              _count: true,
              where: { empresaId: user.empresaId, criadoEm: { gte: startDate } },
            })
          : Promise.resolve(null),
        canReadFinancial
          ? prisma.expense.aggregate({
              _sum: { valor: true },
              _count: true,
              where: { empresaId: user.empresaId, criadoEm: { gte: startDate } },
            })
          : Promise.resolve(null),
        canReadFinancial
          ? prisma.bankAccount.aggregate({
              _sum: { saldoAtual: true },
              _count: true,
              where: { empresaId: user.empresaId, ativo: true },
            })
          : Promise.resolve(null),
        prisma.material.aggregate({ _count: true }),
        prisma.materialSaldo.aggregate({ _sum: { quantidade: true } }),
        prisma.materialMovimentacao.count({
          where: { criadoEm: { gte: startDate } },
        }),
        prisma.projeto.findMany({
          where: {
            status: {
              in: activeProjectStatuses,
            },
          },
          select: {
            id: true,
            titulo: true,
            status: true,
            prioridade: true,
            dataInicioPrevista: true,
            dataConclusaoPrevista: true,
            valorEstimado: true,
            custoReal: true,
          },
          orderBy: { dataInicioPrevista: 'desc' },
          take: 10,
        }),
        prisma.projeto.count({
          where: {
            status: { in: activeProjectStatuses },
          },
        }),
        prisma.projeto.count({
          where: {
            status: { in: activeProjectStatuses },
            dataConclusaoPrevista: { lt: new Date() },
          },
        }),
        prisma.projeto.count({
          where: {
            status: { in: activeProjectStatuses },
            valorEstimado: { not: null },
            custoReal: { gt: prisma.projeto.fields.valorEstimado },
          },
        }),
        prisma.worker.count({ where: { status: 'ACTIVE' } }),
        prisma.cliente.aggregate({
          _count: true,
          where: { empresaId: user.empresaId, ativo: true },
        }),
        prisma.proposta.groupBy({
          by: ['status'],
          where: { empresaId: user.empresaId, deletedAt: null },
          _count: true,
        }),
        canReadFinancial
          ? prisma.invoice.aggregate({
              _count: true,
              _sum: { valorTotal: true },
              where: {
                empresaId: user.empresaId,
                criadoEm: { gte: startDate },
                status: { notIn: ['CANCELLED', 'DRAFT'] },
              },
            })
          : Promise.resolve(null),
        // Período anterior — junto com o resto para evitar round-trip extra
        canReadFinancial
          ? prisma.revenue.aggregate({
              _sum: { valor: true },
              where: {
                empresaId: user.empresaId,
                criadoEm: { gte: previousStartDate, lt: startDate },
              },
            })
          : Promise.resolve(null),
        // Chart time-series: receita mensal (últimos 6 meses)
        canReadFinancial
          ? prisma.revenue.findMany({
              where: { empresaId: user.empresaId, criadoEm: { gte: sixMonthsAgo } },
              select: { criadoEm: true, valor: true },
              orderBy: { criadoEm: 'asc' },
            })
          : Promise.resolve([]),
        // Chart time-series: propostas mensais (últimos 6 meses)
        prisma.proposta.findMany({
          where: { empresaId: user.empresaId, criadoEm: { gte: sixMonthsAgo } },
          select: { criadoEm: true },
          orderBy: { criadoEm: 'asc' },
        }),
        // Chart time-series: novos clientes mensais (últimos 6 meses)
        prisma.cliente.findMany({
          where: { empresaId: user.empresaId, criadoEm: { gte: sixMonthsAgo } },
          select: { criadoEm: true },
          orderBy: { criadoEm: 'asc' },
        }),
      ]);

      // Calcular saldo financeiro
      const totalReceitas = canReadFinancial ? Number(receitas?._sum.valor || 0) : 0;
      const totalDespesas = canReadFinancial ? Number(despesas?._sum.valor || 0) : 0;
      const saldoContas = canReadFinancial ? Number(contasBancarias?._sum.saldoAtual || 0) : 0;
      const saldoPeriodo = canReadFinancial ? totalReceitas - totalDespesas : 0;

      const projetosPayload = projetosList.map((p) => {
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
          health:
            custoAtual !== null && orcamento !== null
              ? custoAtual > orcamento
                ? 'critical'
                : 'good'
              : 'neutral',
        };
      });

      // Consolidar status das propostas
      const propostasStats = {
        total: propostas.reduce((acc, p) => acc + p._count, 0),
        rascunho: propostas.find((p) => p.status === 'RASCUNHO')?._count || 0,
        enviada: propostas.find((p) => p.status === 'ENVIADA')?._count || 0,
        aprovada: propostas.find((p) => p.status === 'APROVADA')?._count || 0,
        cancelada: propostas.find((p) => p.status === 'CANCELADA')?._count || 0,
      };

      const previousTotalReceitas = canReadFinancial
        ? Number(previousReceitas?._sum.valor || 0)
        : 0;
      const crescimentoReceita =
        canReadFinancial && previousTotalReceitas > 0
          ? ((totalReceitas - previousTotalReceitas) / previousTotalReceitas) * 100
          : 0;

      // Build chart time-series (last 6 months)
      const monthLabels = buildMonthLabels(6);
      const chartData = {
        labels: monthLabels,
        revenue: canReadFinancial
          ? groupByMonth(revenueItems, monthLabels, (r) => Number(r.valor || 0))
          : monthLabels.map(() => 0),
        proposals: groupByMonth(propostaItems, monthLabels),
        clients: groupByMonth(clienteItems, monthLabels),
      };

      return {
        period,
        permissions: {
          canViewFinancials: canReadFinancial,
          currentUserRole: user.role,
        },
        kpis: {
          receitaTotal: canReadFinancial ? Number(totalReceitas) : null,
          despesaTotal: canReadFinancial ? Number(totalDespesas) : null,
          saldoPeriodo: canReadFinancial ? Number(saldoPeriodo) : null,
          saldoContas: canReadFinancial ? Number(saldoContas) : null,
          crescimentoReceita: canReadFinancial ? Number(crescimentoReceita) : null,
          projetosAtivos,
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
          invoicesTotal: canReadFinancial ? (invoices?._count ?? 0) : 0,
          invoicesFaturamento: canReadFinancial ? Number(invoices?._sum.valorTotal || 0) : null,
        },
        projetos: projetosPayload,
        alertas: [
          ...(projetosComAtraso > 0
            ? [
                {
                  tipo: 'projeto',
                  severidade: 'high' as const,
                  mensagem: `${projetosComAtraso} projeto(s) atrasado(s)`,
                  count: projetosComAtraso,
                },
              ]
            : []),
          ...(projetosSobreOrcamento > 0
            ? [
                {
                  tipo: 'projeto',
                  severidade: 'medium' as const,
                  mensagem: `${projetosSobreOrcamento} projeto(s) sobre orçamento`,
                  count: projetosSobreOrcamento,
                },
              ]
            : []),
          ...(canReadFinancial && saldoPeriodo < 0
            ? [
                {
                  tipo: 'financeiro',
                  severidade: 'high' as const,
                  mensagem: 'Saldo negativo no período',
                  valor: Number(saldoPeriodo),
                },
              ]
            : []),
        ],
        chartData,
      };
    },
    { ttlSeconds: cacheTtlSeconds },
  );

  return NextResponse.json(
    { data: response, success: true },
    { status: 200, headers: { 'Cache-Control': 'no-store, private' } },
  );
});
