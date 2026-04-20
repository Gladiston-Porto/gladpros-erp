import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { apiRateLimit } from '@/shared/lib/rate-limit';

function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 86_400_000);
    case '30d': return new Date(now.getTime() - 30 * 86_400_000);
    case '90d': return new Date(now.getTime() - 90 * 86_400_000);
    case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default: return new Date(now.getTime() - 30 * 86_400_000);
  }
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'dashboard', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const rateCheck = await apiRateLimit.isAllowed(request);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: rateCheck.message, success: false },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d';
  const since = getPeriodDate(period);

  const lastPeriodStart = new Date(since.getTime() - (Date.now() - since.getTime()));

  const [
    totalProposals,
    proposalsByStatus,
    totalClients,
    totalProjects,
    projectsByStatus,
    invoiceAgg,
    invoiceAggLastPeriod,
    serviceOrdersByStatus,
    recentEvents,
    topClients,
  ] = await Promise.all([
    // Proposals
    prisma.proposta.count({ where: { deletedAt: null } }),
    prisma.proposta.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
    // Clients
    prisma.cliente.count(),
    // Projects
    prisma.projeto.count(),
    prisma.projeto.groupBy({ by: ['status'], _count: true }),
    // Revenue current period
    prisma.invoice.aggregate({
      where: { dataEmissao: { gte: since }, status: { not: 'CANCELLED' } },
      _sum: { valorTotal: true, saldo: true },
      _count: true,
    }),
    // Revenue last period (for growth calc)
    prisma.invoice.aggregate({
      where: { dataEmissao: { gte: lastPeriodStart, lt: since }, status: { not: 'CANCELLED' } },
      _sum: { valorTotal: true },
    }),
    // Service Orders
    prisma.serviceOrder.groupBy({ by: ['status'], _count: true }),
    // Recent domain events
    prisma.domainEvent.findMany({
      orderBy: { occurredAt: 'desc' },
      take: 10,
      select: { id: true, name: true, aggregateType: true, aggregateId: true, occurredAt: true, status: true },
    }),
    // Top clients by invoice revenue
    prisma.invoice.groupBy({
      by: ['projetoId'],
      where: { status: { not: 'CANCELLED' } },
      _sum: { valorTotal: true },
      _count: true,
      orderBy: { _sum: { valorTotal: 'desc' } },
      take: 5,
    }),
  ]);

  // Build proposals by status map
  const proposalStatusMap: Record<string, number> = {};
  for (const g of proposalsByStatus) {
    proposalStatusMap[g.status] = g._count;
  }

  // Build projects by status map
  const projectStatusMap: Record<string, number> = {};
  for (const g of projectsByStatus) {
    projectStatusMap[g.status] = g._count;
  }

  // Build SO by status map
  const soStatusMap: Record<string, number> = {};
  for (const g of serviceOrdersByStatus) {
    soStatusMap[g.status] = g._count;
  }

  // Revenue
  const currentRevenue = Number(invoiceAgg._sum.valorTotal ?? 0);
  const lastRevenue = Number(invoiceAggLastPeriod._sum.valorTotal ?? 0);
  const growth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

  // Top clients: resolve project → client names — single query instead of N queries
  const projetoIds = topClients
    .filter(tc => tc.projetoId != null)
    .map(tc => tc.projetoId as number);

  const projetosMap: Map<number, { Cliente: { nomeFantasia: string | null; nomeCompleto: string } | null }> =
    projetoIds.length > 0
      ? await prisma.projeto.findMany({
          where: { id: { in: projetoIds } },
          select: { id: true, Cliente: { select: { nomeFantasia: true, nomeCompleto: true } } },
        }).then(ps => new Map(ps.map(p => [p.id, p])))
      : new Map();

  const topClientData = topClients
    .filter(tc => tc.projetoId != null)
    .map(tc => {
      const projeto = projetosMap.get(tc.projetoId as number);
      return {
        name: projeto?.Cliente?.nomeFantasia || projeto?.Cliente?.nomeCompleto || `Projeto #${tc.projetoId}`,
        invoices: tc._count,
        revenue: Number(tc._sum.valorTotal ?? 0),
      };
    });

  return NextResponse.json({
    success: true,
    data: {
      totalProposals,
      activeProposals: (proposalStatusMap['ENVIADA'] ?? 0) + (proposalStatusMap['EM_ANALISE'] ?? 0),
      totalClients,
      totalProjects,
      revenue: {
        currentPeriod: currentRevenue,
        lastPeriod: lastRevenue,
        growth: Math.round(growth * 100) / 100,
        openBalance: Number(invoiceAgg._sum.saldo ?? 0),
        invoiceCount: invoiceAgg._count,
      },
      proposalsByStatus: proposalStatusMap,
      projectsByStatus: projectStatusMap,
      serviceOrdersByStatus: soStatusMap,
      recentActivity: recentEvents.map((e) => ({
        id: e.id,
        type: e.name,
        description: `${e.name} — ${e.aggregateType} #${e.aggregateId}`,
        timestamp: e.occurredAt.toISOString(),
        status: e.status,
      })),
      topClients: topClientData,
    },
    period,
    timestamp: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store, private' } });
});
