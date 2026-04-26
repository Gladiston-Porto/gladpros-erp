import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/reports/jobs-over-budget?page=1&pageSize=20&minStatus=ALERT
// minStatus: ALERT | CRITICAL | LOSS (default CRITICAL)
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'reports', 'read')) {
      return NextResponse.json({ error: 'Forbidden', success: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
    const minStatus = searchParams.get('minStatus') ?? 'CRITICAL';

    const statusFilter = ['LOSS', 'CRITICAL', 'ALERT'].slice(
      ['LOSS', 'CRITICAL', 'ALERT'].indexOf(minStatus as string) >= 0
        ? ['LOSS', 'CRITICAL', 'ALERT'].indexOf(minStatus as string)
        : 0
    );

    const [total, data] = await Promise.all([
      prisma.serviceOrder.count({
        where: {
          deletedAt: null,
          marginStatus: { in: statusFilter },
        },
      }),
      prisma.serviceOrder.findMany({
        where: {
          deletedAt: null,
          marginStatus: { in: statusFilter },
        },
        select: {
          id: true,
          orderNumber: true,
          title: true,
          status: true,
          marginStatus: true,
          laborTotal: true,
          materialTotal: true,
          agreedClientPrice: true,
          materialEstimate: true,
          laborEstimate: true,
          createdAt: true,
          completedAt: true,
          Cliente: { select: { nomeCompleto: true, nomeFantasia: true } },
          AssignedWorker: { select: { nome: true } },
        },
        orderBy: [
          // LOSS first, then CRITICAL, then ALERT
          { marginStatus: 'asc' },
          { createdAt: 'desc' },
        ],
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
    ]);

    const items = data.map((os) => {
      const agreed = Number(os.agreedClientPrice ?? 0);
      const labor = Number(os.laborTotal);
      const material = Number(os.materialTotal);
      const totalCost = labor + material;
      const grossMargin = agreed - totalCost;
      const marginPct = agreed > 0 ? (grossMargin / agreed) * 100 : 0;
      const overage = Math.max(0, totalCost - agreed);

      const matEst = Number(os.materialEstimate ?? 0);
      const labEst = Number(os.laborEstimate ?? 0);
      const totalEst = matEst + labEst;
      const overageVsEstimate = totalEst > 0 ? totalCost - totalEst : null;

      return {
        id: os.id,
        orderNumber: os.orderNumber ?? `OS-${os.id}`,
        title: os.title,
        status: os.status,
        marginStatus: os.marginStatus,
        clientName: os.Cliente?.nomeCompleto || os.Cliente?.nomeFantasia || '—',
        assignedWorker: os.AssignedWorker?.nome ?? null,
        agreedClientPrice: agreed,
        laborCost: labor,
        materialCost: material,
        totalCost,
        grossMargin,
        marginPct: Number(marginPct.toFixed(2)),
        overage,
        overageVsEstimate,
        createdAt: os.createdAt,
        completedAt: os.completedAt,
      };
    });

    return NextResponse.json({
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    console.error('[API] reports/jobs-over-budget error:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}
