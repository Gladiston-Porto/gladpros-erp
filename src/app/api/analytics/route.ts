// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, subMonths, startOfDay } from 'date-fns';
import { withErrorHandler } from '@/lib/api/error-handler';
import { withBusinessCache } from '@/shared/lib/cache/business-cache';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

type ActivityType = 'nova_proposta' | 'aprovacao' | 'cancelamento' | 'novo_cliente';
type Activity = { id: string; type: ActivityType; description: string; timestamp: string };

export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    const canReadDashboard = can(user.role as Role, 'dashboard', 'read');
    const canReadAnalytics = can(user.role as Role, 'analytics', 'read');

    if (!canReadDashboard && !canReadAnalytics) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const requestedRole = (searchParams.get('role') || 'all').trim();
    const normalizedRole =
      requestedRole === 'all'
        ? 'all'
        : ({
            admin: 'ADMIN',
            gerente: 'GERENTE',
            manager: 'GERENTE',
            user: 'USUARIO',
            usuario: 'USUARIO',
            financeiro: 'FINANCEIRO',
            estoque: 'ESTOQUE',
            cliente: 'CLIENTE',
            ADMIN: 'ADMIN',
            GERENTE: 'GERENTE',
            USUARIO: 'USUARIO',
            FINANCEIRO: 'FINANCEIRO',
            ESTOQUE: 'ESTOQUE',
            CLIENTE: 'CLIENTE',
          } as const)[requestedRole] ?? 'all';

    const cacheKey = `dashboard_analytics:${String(user.role).toUpperCase()}:${normalizedRole}:${period}`;
    const cacheTtlSeconds = process.env.NODE_ENV === 'production' ? 120 : 30;

    const analyticsData = await withBusinessCache(
      cacheKey,
      async () => {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = startOfDay(subDays(new Date(), days));
        const sixMonthsAgo = startOfDay(subMonths(new Date(), 6));

        const validRoles: Role[] = ['ADMIN', 'GERENTE', 'USUARIO', 'FINANCEIRO', 'ESTOQUE', 'CLIENTE'];
        const roleFilter = normalizedRole !== 'all' && validRoles.includes(normalizedRole as Role)
          ? { nivel: normalizedRole }
          : {};

        const [
          totalUsers,
          activeUsers,
          totalClients,
          totalProposals,
          loginAttemptsTotal,
          failedLoginsTotal,
          auditEvents,
          clientsByStatus,
          proposalsByStatus,
          auditActionsByType,
          usersByNivel,
          recentProposals,
          recentClients,
          lastAuditEvent,
          loginAttemptsByDay,
          monthlyProposals,
          monthlyUsers,
          monthlyActiveUsers,
        ] = await Promise.all([
          prisma.usuario.count({ where: { ...roleFilter } }),
          prisma.usuario.count({ where: { ...roleFilter, ultimoLoginEm: { gte: startDate } } }),
          prisma.cliente.count(),
          prisma.proposta.count({ where: { deletedAt: null } }),
          prisma.tentativaLogin.count({ where: { criadaEm: { gte: startDate } } }),
          prisma.tentativaLogin.count({ where: { sucesso: false, criadaEm: { gte: startDate } } }),
          prisma.auditoria.count({ where: { criadoEm: { gte: startDate } } }),
          prisma.cliente.groupBy({ by: ['status'], _count: { status: true } }),
          prisma.proposta.groupBy({ by: ['status'], _count: { status: true }, where: { deletedAt: null } }),
          prisma.auditoria.groupBy({ by: ['acao'], _count: { acao: true }, where: { criadoEm: { gte: startDate } } }),
          prisma.usuario.groupBy({ by: ['nivel'], _count: { nivel: true } }),
          prisma.proposta.findMany({
            take: 5,
            orderBy: { criadoEm: 'desc' },
            where: { deletedAt: null },
            select: {
              id: true,
              numeroProposta: true,
              status: true,
              criadoEm: true,
              Cliente: { select: { nomeFantasia: true, nomeCompleto: true } },
            },
          }),
          prisma.cliente.findMany({
            take: 5,
            orderBy: { criadoEm: 'desc' },
            select: { id: true, nomeFantasia: true, nomeCompleto: true, criadoEm: true },
          }),
          prisma.auditoria.findFirst({ orderBy: { criadoEm: 'desc' }, select: { criadoEm: true } }),
          prisma.$queryRaw<Array<{
            date: string;
            attempts: bigint;
            successful: bigint;
            failed: bigint;
          }>>`
            SELECT
              DATE_FORMAT(criadaEm, '%Y-%m-%d') as date,
              CAST(COUNT(*) AS SIGNED) as attempts,
              CAST(SUM(CASE WHEN sucesso = 1 THEN 1 ELSE 0 END) AS SIGNED) as successful,
              CAST(SUM(CASE WHEN sucesso = 0 THEN 1 ELSE 0 END) AS SIGNED) as failed
            FROM TentativaLogin
            WHERE criadaEm >= ${startDate}
            GROUP BY DATE_FORMAT(criadaEm, '%Y-%m-%d')
            ORDER BY date ASC
          `,
          prisma.$queryRaw<Array<{
            month: string; label: string; propostas: bigint;
          }>>`
            SELECT
              DATE_FORMAT(criadoEm, '%Y-%m') as month,
              DATE_FORMAT(criadoEm, '%b') as label,
              CAST(COUNT(*) AS SIGNED) as propostas
            FROM Proposta
            WHERE criadoEm >= ${sixMonthsAgo} AND deletedAt IS NULL
            GROUP BY DATE_FORMAT(criadoEm, '%Y-%m'), DATE_FORMAT(criadoEm, '%b')
            ORDER BY month ASC
          `,
          prisma.$queryRaw<Array<{
            month: string; label: string; usuarios: bigint;
          }>>`
            SELECT
              DATE_FORMAT(criadoEm, '%Y-%m') as month,
              DATE_FORMAT(criadoEm, '%b') as label,
              CAST(COUNT(*) AS SIGNED) as usuarios
            FROM Usuario
            WHERE criadoEm >= ${sixMonthsAgo}
            GROUP BY DATE_FORMAT(criadoEm, '%Y-%m'), DATE_FORMAT(criadoEm, '%b')
            ORDER BY month ASC
          `,
          prisma.$queryRaw<Array<{
            month: string; label: string; ativos: bigint;
          }>>`
            SELECT
              DATE_FORMAT(ultimoLoginEm, '%Y-%m') as month,
              DATE_FORMAT(ultimoLoginEm, '%b') as label,
              CAST(COUNT(DISTINCT id) AS SIGNED) as ativos
            FROM Usuario
            WHERE ultimoLoginEm >= ${sixMonthsAgo}
            GROUP BY DATE_FORMAT(ultimoLoginEm, '%Y-%m'), DATE_FORMAT(ultimoLoginEm, '%b')
            ORDER BY month ASC
          `,
        ]);

        // Merge monthly metrics
        const metricsMap: Record<string, { name: string; usuarios: number; ativos: number; propostas: number }> = {};
        for (const row of monthlyProposals) {
          if (!metricsMap[row.month]) metricsMap[row.month] = { name: row.label, usuarios: 0, ativos: 0, propostas: 0 };
          metricsMap[row.month].propostas = Number(row.propostas);
        }
        for (const row of monthlyUsers) {
          if (!metricsMap[row.month]) metricsMap[row.month] = { name: row.label, usuarios: 0, ativos: 0, propostas: 0 };
          metricsMap[row.month].usuarios = Number(row.usuarios);
        }
        for (const row of monthlyActiveUsers) {
          if (!metricsMap[row.month]) metricsMap[row.month] = { name: row.label, usuarios: 0, ativos: 0, propostas: 0 };
          metricsMap[row.month].ativos = Number(row.ativos);
        }
        const userMetricsData = Object.entries(metricsMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);

        // Proposal status counts
        const statusCountMap: Record<string, number> = {};
        for (const row of proposalsByStatus) statusCountMap[row.status] = row._count.status;
        const propostasAprovadas = (statusCountMap['APROVADA'] || 0) + (statusCountMap['ASSINADA'] || 0);
        const propostasPendentes = (statusCountMap['RASCUNHO'] || 0) + (statusCountMap['ENVIADA'] || 0);

        // Build recent activity from real proposals + clients
        const activities: Activity[] = [];
        for (const p of recentProposals) {
          const clientName = p.Cliente?.nomeFantasia || p.Cliente?.nomeCompleto || 'Cliente';
          let type: ActivityType = 'nova_proposta';
          if (p.status === 'APROVADA' || p.status === 'ASSINADA') type = 'aprovacao';
          else if (p.status === 'CANCELADA') type = 'cancelamento';
          activities.push({
            id: `proposta-${p.id}`,
            type,
            description: `Proposta ${p.numeroProposta} — ${clientName}`,
            timestamp: p.criadoEm.toISOString(),
          });
        }
        for (const c of recentClients) {
          const name = c.nomeFantasia || c.nomeCompleto || 'Novo cliente';
          activities.push({
            id: `cliente-${c.id}`,
            type: 'novo_cliente',
            description: `Cliente cadastrado: ${name}`,
            timestamp: c.criadoEm.toISOString(),
          });
        }
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // System health from real failed login rate
        const failedLoginRate = loginAttemptsTotal > 0 ? failedLoginsTotal / loginAttemptsTotal : 0;
        const systemHealth: 'good' | 'warning' | 'error' =
          failedLoginsTotal > 20 ? 'error' : failedLoginRate > 0.3 ? 'warning' : 'good';

        return {
          overview: {
            totalUsers,
            activeUsers,
            totalClients,
            totalProposals,
            propostasAprovadas,
            propostasPendentes,
            loginAttempts: loginAttemptsTotal,
            failedLogins: failedLoginsTotal,
            auditEvents,
            systemHealth,
            lastActivityAt: lastAuditEvent?.criadoEm?.toISOString() ?? null,
          },
          charts: {
            loginAttemptsByDay: loginAttemptsByDay.map(row => ({
              date: row.date,
              attempts: Number(row.attempts),
              successful: Number(row.successful),
              failed: Number(row.failed),
            })),
            auditActions: auditActionsByType.map(row => ({
              action: row.acao,
              count: row._count.acao,
            })),
            usersByRole: usersByNivel.map(row => ({
              role: row.nivel,
              count: row._count.nivel,
            })),
            proposalsByStatus: proposalsByStatus.map(row => ({
              status: row.status,
              count: row._count.status,
            })),
            clientsByStatus: clientsByStatus.map(row => ({
              status: row.status,
              count: row._count.status,
            })),
            userMetrics: userMetricsData,
          },
          recentActivity: activities.slice(0, 8),
          period,
          userRole: normalizedRole,
          generatedAt: new Date().toISOString(),
        };
      },
      { ttlSeconds: cacheTtlSeconds }
    );

    return NextResponse.json({ data: analyticsData, success: true }, { status: 200 });
  });
