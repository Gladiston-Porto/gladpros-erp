import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/reports/financial-summary?period=weekly|monthly|annual&year=2025&month=6&week=24
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') ?? 'monthly') as 'weekly' | 'monthly' | 'annual';
    const now = new Date();
    const year = Number(searchParams.get('year') ?? now.getFullYear());
    const month = Number(searchParams.get('month') ?? now.getMonth() + 1);
    const week = searchParams.get('week') ? Number(searchParams.get('week')) : undefined;

    // Compute date range
    let rangeStart: Date;
    let rangeEnd: Date;

    if (period === 'annual') {
      rangeStart = new Date(year, 0, 1);
      rangeEnd = new Date(year, 11, 31, 23, 59, 59);
    } else if (period === 'weekly' && week !== undefined) {
      // ISO week calculation
      const jan1 = new Date(year, 0, 1);
      const dayOfWeek = jan1.getDay() || 7;
      const firstMonday = dayOfWeek <= 4
        ? new Date(year, 0, 1 - dayOfWeek + 1)
        : new Date(year, 0, 8 - dayOfWeek + 1);
      rangeStart = new Date(firstMonday.getTime() + (week - 1) * 7 * 86400000);
      rangeEnd = new Date(rangeStart.getTime() + 6 * 86400000 + 86399000);
    } else {
      // monthly
      rangeStart = new Date(year, month - 1, 1);
      rangeEnd = new Date(year, month, 0, 23, 59, 59);
    }

    // Fetch OS and invoice data in parallel
    const [osData, invoiceData] = await Promise.all([
      prisma.serviceOrder.findMany({
        where: {
          completedAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: {
          id: true,
          status: true,
          laborTotal: true,
          materialTotal: true,
          agreedClientPrice: true,
          marginStatus: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          criadoEm: { gte: rangeStart, lte: rangeEnd },
        },
        select: {
          id: true,
          valorTotal: true,
          status: true,
          pagamentos: {
            where: { estornadoEm: null },
            select: { valor: true },
          },
        },
      }),
    ]);

    // OS aggregates
    let totalRevenue = 0;
    let totalCost = 0;
    let osCount = 0;
    let osWithPriceCount = 0;
    const marginStatusCount: Record<string, number> = { OK: 0, WARNING: 0, ALERT: 0, CRITICAL: 0, LOSS: 0 };

    for (const os of osData) {
      osCount++;
      const agreed = Number(os.agreedClientPrice ?? 0);
      const cost = Number(os.laborTotal) + Number(os.materialTotal);
      if (agreed > 0) {
        osWithPriceCount++;
        totalRevenue += agreed;
        totalCost += cost;
      }
      marginStatusCount[os.marginStatus] = (marginStatusCount[os.marginStatus] ?? 0) + 1;
    }

    // Invoice aggregates
    let invoiceTotal = 0;
    let invoicePaid = 0;
    let invoiceCount = 0;
    for (const inv of invoiceData) {
      invoiceCount++;
      invoiceTotal += Number(inv.valorTotal ?? 0);
      for (const pmt of inv.pagamentos) {
        invoicePaid += Number(pmt.valor ?? 0);
      }
    }

    const grossMargin = totalRevenue - totalCost;
    const grossMarginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    const avgMarginPct = osWithPriceCount > 0 ? grossMarginPct : 0;
    const invoicePending = invoiceTotal - invoicePaid;

    return NextResponse.json({
      data: {
        period,
        rangeStart,
        rangeEnd,
        // OS P&L
        osCount,
        osWithPriceCount,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        grossMargin: Number(grossMargin.toFixed(2)),
        grossMarginPct: Number(grossMarginPct.toFixed(2)),
        avgMarginPct: Number(avgMarginPct.toFixed(2)),
        marginStatusBreakdown: marginStatusCount,
        // Invoice
        invoiceCount,
        invoiceTotal: Number(invoiceTotal.toFixed(2)),
        invoicePaid: Number(invoicePaid.toFixed(2)),
        invoicePending: Number(invoicePending.toFixed(2)),
        collectionRate: invoiceTotal > 0 ? Number(((invoicePaid / invoiceTotal) * 100).toFixed(2)) : 0,
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('[API] reports/financial-summary error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
