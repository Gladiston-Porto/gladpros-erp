import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';

// ── GET /api/invoices/stats ───────────────────────────────────────────────────
// Retorna totais financeiros das invoices para os cards de sumário

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!can(user.role as Role, 'invoices', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  // Single-tenant: Invoice model has no direct empresaId field.
  // Auth + RBAC provides sufficient protection.
  const [aggregate, countVencidas, countTotal] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: { notIn: ['CANCELLED'] } },
      _sum: { valorTotal: true, valorPago: true, saldo: true },
    }),
    prisma.invoice.count({
      where: { status: 'OVERDUE' },
    }),
    prisma.invoice.count({
      where: { status: { notIn: ['CANCELLED'] } },
    }),
  ]);

  const totalFaturado = Number(aggregate._sum.valorTotal ?? 0);
  const totalRecebido = Number(aggregate._sum.valorPago ?? 0);
  const totalPendente = Number(aggregate._sum.saldo ?? 0);

  return NextResponse.json({
    data: {
      totalFaturado,
      totalRecebido,
      totalPendente,
      countVencidas,
      countTotal,
    },
    success: true,
  });
});
