import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/reports/pnl?type=os|project&page=1&pageSize=20&period=monthly&year=2025&month=6
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'os'; // 'os' | 'project' | 'all'
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
    const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined;

    // Date range filter
    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (year) {
      const startMonth = month ?? 1;
      const endMonth = month ?? 12;
      dateFilter = {
        gte: new Date(year, startMonth - 1, 1),
        lte: new Date(year, endMonth, 0, 23, 59, 59),
      };
    }

    const pnlItems: Array<{
      id: number;
      type: 'os' | 'project';
      reference: string;
      title: string;
      status: string;
      clientName: string;
      agreedPrice: number;
      laborCost: number;
      materialCost: number;
      totalCost: number;
      grossMargin: number;
      marginPct: number;
      marginStatus: string;
      completedAt: Date | null;
    }> = [];

    if (type === 'os' || type === 'all') {
      const [osTotal, osData] = await Promise.all([
        prisma.serviceOrder.count({
          where: {
            ...(dateFilter ? { completedAt: dateFilter } : {}),
          },
        }),
        prisma.serviceOrder.findMany({
          where: {
            ...(dateFilter ? { completedAt: dateFilter } : {}),
          },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            laborTotal: true,
            materialTotal: true,
            agreedClientPrice: true,
            marginStatus: true,
            completedAt: true,
            Cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
          },
          orderBy: { completedAt: 'desc' },
          take: type === 'os' ? pageSize : 500,
          skip: type === 'os' ? (page - 1) * pageSize : 0,
        }),
      ]);

      for (const os of osData) {
        const agreed = Number(os.agreedClientPrice ?? 0);
        const labor = Number(os.laborTotal);
        const material = Number(os.materialTotal);
        const totalCost = labor + material;
        const grossMargin = agreed - totalCost;
        const marginPct = agreed > 0 ? (grossMargin / agreed) * 100 : 0;

        pnlItems.push({
          id: os.id,
          type: 'os',
          reference: os.ticketNumber ?? `OS-${os.id}`,
          title: os.title,
          status: os.status,
          clientName: os.Cliente?.nomeCompleto || os.Cliente?.nomeFantasia || '—',
          agreedPrice: agreed,
          laborCost: labor,
          materialCost: material,
          totalCost,
          grossMargin,
          marginPct: Number(marginPct.toFixed(2)),
          marginStatus: os.marginStatus,
          completedAt: os.completedAt,
        });
      }

      if (type === 'os') {
        return NextResponse.json({
          data: pnlItems,
          pagination: { page, pageSize, total: osTotal, totalPages: Math.ceil(osTotal / pageSize) },
          success: true,
        });
      }
    }

    if (type === 'project' || type === 'all') {
      const [projTotal, projData] = await Promise.all([
        prisma.projeto.count({
          where: {
            ...(dateFilter ? { dataConclusaoReal: dateFilter } : {}),
          },
        }),
        prisma.projeto.findMany({
          where: {
            ...(dateFilter ? { dataConclusaoReal: dateFilter } : {}),
          },
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
            status: true,
            custoPrevisto: true,
            custoReal: true,
            valorEstimado: true,
            margemPrevista: true,
            margemReal: true,
            dataConclusaoReal: true,
            Cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
          },
          orderBy: { dataConclusaoReal: 'desc' },
          take: type === 'project' ? pageSize : 500,
          skip: type === 'project' ? (page - 1) * pageSize : 0,
        }),
      ]);

      for (const proj of projData) {
        const agreed = Number(proj.valorEstimado ?? 0);
        const totalCost = Number(proj.custoReal ?? proj.custoPrevisto ?? 0);
        const grossMargin = agreed - totalCost;
        const marginPct = agreed > 0 ? (grossMargin / agreed) * 100 : Number(proj.margemReal ?? proj.margemPrevista ?? 0);

        pnlItems.push({
          id: proj.id,
          type: 'project',
          reference: proj.numeroProjeto ?? `PRJ-${proj.id}`,
          title: proj.titulo,
          status: proj.status,
          clientName: proj.Cliente?.nomeCompleto || proj.Cliente?.nomeFantasia || '—',
          agreedPrice: agreed,
          laborCost: 0,
          materialCost: totalCost,
          totalCost,
          grossMargin,
          marginPct: Number(marginPct.toFixed(2)),
          marginStatus: marginPct < 0 ? 'LOSS' : marginPct < 10 ? 'CRITICAL' : marginPct < 20 ? 'WARNING' : 'OK',
          completedAt: proj.dataConclusaoReal,
        });
      }

      if (type === 'project') {
        return NextResponse.json({
          data: pnlItems,
          pagination: { page, pageSize, total: projTotal, totalPages: Math.ceil(projTotal / pageSize) },
          success: true,
        });
      }
    }

    // type=all — combine and sort by completedAt desc
    pnlItems.sort((a, b) => {
      if (!a.completedAt && !b.completedAt) return 0;
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return b.completedAt.getTime() - a.completedAt.getTime();
    });

    const total = pnlItems.length;
    const paginated = pnlItems.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      data: paginated,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('[API] reports/pnl error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
