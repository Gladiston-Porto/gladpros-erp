import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { prisma } from '@/lib/prisma';

// Mock data for reports
const mockReportsData = {
  proposalsReport: {
    total: 45,
    byStatus: {
      rascunho: 8,
      enviada: 15,
      aprovada: 12,
      rejeitada: 5,
      finalizada: 5
    },
    byMonth: [
      { month: 'Jan', count: 5 },
      { month: 'Fev', count: 8 },
      { month: 'Mar', count: 12 },
      { month: 'Abr', count: 7 },
      { month: 'Mai', count: 13 }
    ],
    averageValue: 8750,
    totalValue: 393750
  },
  clientsReport: {
    total: 28,
    active: 22,
    newThisMonth: 3,
    topByRevenue: [
      { name: 'Tech Solutions Ltda', revenue: 45000, proposals: 8 },
      { name: 'Inovação Digital', revenue: 32000, proposals: 6 },
      { name: 'Global Systems', revenue: 28000, proposals: 5 }
    ]
  },
  performanceReport: {
    conversionRate: 26.67, // approved / sent
    averageProposalTime: 7.5, // days
    successRate: 71.43, // approved / (approved + rejected)
    monthlyGrowth: 15.2
  }
};

export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let data = mockReportsData;

    // Filter by type if specified
    if (type !== 'all') {
      data = { [type]: mockReportsData[type as keyof typeof mockReportsData] } as typeof mockReportsData;
    }

    return NextResponse.json({
      success: true,
      data,
      filters: { type, startDate, endDate },
      timestamp: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'no-store, private' } });
  });

const exportSchema = z.object({
  type: z.enum(['clients', 'proposals', 'revenue']),
  format: z.enum(['json', 'csv', 'xlsx']).default('csv'),
  fields: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Export reports as CSV / JSON blob
export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    const body = exportSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation failed', message: body.error.issues[0]?.message, success: false },
        { status: 400 }
      );
    }

    const { type, format, startDate, endDate } = body.data;

    // Build report data from database
    const since = startDate ? new Date(startDate) : undefined;
    const until = endDate ? new Date(endDate) : undefined;

    let rows: Record<string, unknown>[] = [];

    if (type === 'clients') {
      const clients = await prisma.cliente.findMany({
        where: { ...(since || until ? { criadoEm: { gte: since, lte: until } } : {}) },
        select: { id: true, nomeCompleto: true, nomeFantasia: true, email: true, ativo: true, criadoEm: true },
        take: 500,
        orderBy: { criadoEm: 'desc' },
      });
      rows = clients.map(c => ({
        id: c.id,
        nome: c.nomeFantasia || c.nomeCompleto,
        email: c.email ?? '',
        status: c.ativo ? 'Ativo' : 'Inativo',
        criadoEm: c.criadoEm.toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
      }));
    } else if (type === 'proposals') {
      const proposals = await prisma.proposta.findMany({
        where: {
          deletedAt: null,
          ...(since || until ? { criadoEm: { gte: since, lte: until } } : {}),
        },
        select: { id: true, numeroProposta: true, status: true, valorEstimado: true, criadoEm: true },
        take: 500,
        orderBy: { criadoEm: 'desc' },
      });
      rows = proposals.map(p => ({
        id: p.id,
        numero: p.numeroProposta,
        status: p.status,
        valor: Number(p.valorEstimado ?? 0).toFixed(2),
        criadoEm: p.criadoEm.toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
      }));
    } else {
      // revenue
      const revenues = await prisma.revenue.findMany({
        where: { ...(since || until ? { criadoEm: { gte: since, lte: until } } : {}) },
        select: { id: true, descricao: true, valor: true, criadoEm: true },
        take: 500,
        orderBy: { criadoEm: 'desc' },
      });
      rows = revenues.map(r => ({
        id: r.id,
        descricao: r.descricao,
        receita: Number(r.valor ?? 0).toFixed(2),
        criadoEm: r.criadoEm.toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
      }));
    }

    if (format === 'json') {
      return NextResponse.json(
        { data: rows, success: true },
        { headers: { 'Cache-Control': 'no-store, private' } }
      );
    }

    // Build CSV
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '').replace(/"/g, '""');
          return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
        }).join(',')
      ),
    ];
    const csvContent = csvLines.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-${type}-${Date.now()}.csv"`,
        'Cache-Control': 'no-store, private',
      },
    });
  });
