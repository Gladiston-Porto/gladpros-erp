import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { z } from 'zod';

function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 86_400_000);
    case '30d':
      return new Date(now.getTime() - 30 * 86_400_000);
    case '90d':
      return new Date(now.getTime() - 90 * 86_400_000);
    case '1y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getTime() - 30 * 86_400_000);
  }
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
  const periodSchema = z.enum(['7d', '30d', '90d', '1y']);
  const periodResult = periodSchema.safeParse(searchParams.get('period') ?? '30d');
  if (!periodResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Parâmetro "period" inválido', success: false },
      { status: 400 },
    );
  }
  const period = periodResult.data;
  const since = getPeriodDate(period);
  const canReadFinancial = can(user.role as Role, 'financeiro', 'read');

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
    prisma.proposta.count({ where: { empresaId: user.empresaId, deletedAt: null } }),
    prisma.proposta.groupBy({
      by: ['status'],
      where: { empresaId: user.empresaId, deletedAt: null },
      _count: true,
    }),
    // Clients
    prisma.cliente.count(),
    // Projects
    prisma.projeto.count({ where: {} }),
    prisma.projeto.groupBy({
      by: ['status'],
      where: {},
      _count: true,
    }),
    // Revenue current period
    canReadFinancial
      ? prisma.invoice.aggregate({
          where: {
            empresaId: user.empresaId,
            dataEmissao: { gte: since },
            status: { not: 'CANCELLED' },
          },
          _sum: { valorTotal: true, saldo: true },
          _count: true,
        })
      : Promise.resolve(null),
    // Revenue last period (for growth calc)
    canReadFinancial
      ? prisma.invoice.aggregate({
          where: {
            empresaId: user.empresaId,
            dataEmissao: { gte: lastPeriodStart, lt: since },
            status: { not: 'CANCELLED' },
          },
          _sum: { valorTotal: true },
        })
      : Promise.resolve(null),
    // Service Orders
    prisma.serviceOrder.groupBy({
      by: ['status'],
      where: { empresaId: user.empresaId },
      _count: true,
    }),
    // Recent domain events
    prisma.domainEvent.findMany({
      orderBy: { occurredAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        aggregateType: true,
        aggregateId: true,
        occurredAt: true,
        status: true,
      },
    }),
    // Top clients by invoice revenue
    canReadFinancial
      ? prisma.invoice.groupBy({
          by: ['clienteId'],
          where: { empresaId: user.empresaId, status: { not: 'CANCELLED' } },
          _sum: { valorTotal: true },
          _count: true,
          orderBy: { _sum: { valorTotal: 'desc' } },
          take: 5,
        })
      : Promise.resolve([]),
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
  const currentRevenue = canReadFinancial ? Number(invoiceAgg?._sum.valorTotal ?? 0) : 0;
  const lastRevenue = canReadFinancial ? Number(invoiceAggLastPeriod?._sum.valorTotal ?? 0) : 0;
  const growth =
    canReadFinancial && lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

  // Top clients: aggregate directly by clienteId (includes direct SO/Invoice billing flows)
  const clienteIds = topClients.map((tc) => tc.clienteId).filter((id): id is number => id != null);

  const clientesMap: Map<number, { nomeFantasia: string | null; nomeCompleto: string | null }> =
    clienteIds.length > 0
      ? await prisma.cliente
          .findMany({
            where: { id: { in: clienteIds } },
            select: { id: true, nomeFantasia: true, nomeCompleto: true },
          })
          .then((cs) => new Map(cs.map((c) => [c.id, c])))
      : new Map();

  const topClientData = topClients.map((tc) => {
    const cliente = clientesMap.get(tc.clienteId as number);
    return {
      name: cliente?.nomeFantasia || cliente?.nomeCompleto || `Cliente #${tc.clienteId}`,
      invoices: tc._count,
      revenue: Number(tc._sum.valorTotal ?? 0),
    };
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        totalProposals,
        activeProposals: proposalStatusMap['ENVIADA'] ?? 0,
        totalClients,
        totalProjects,
        revenue: canReadFinancial
          ? {
              currentPeriod: currentRevenue,
              lastPeriod: lastRevenue,
              growth: Math.round(growth * 100) / 100,
              openBalance: Number(invoiceAgg?._sum.saldo ?? 0),
              invoiceCount: invoiceAgg?._count ?? 0,
            }
          : null,
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
        topClients: canReadFinancial ? topClientData : [],
        permissions: {
          canViewFinancials: canReadFinancial,
        },
      },
      period,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
});
