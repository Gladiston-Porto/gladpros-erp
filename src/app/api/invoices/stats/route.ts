import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';

// ── GET /api/invoices/stats ───────────────────────────────────────────────────
// Retorna totais financeiros das invoices para os cards de sumário

function canReadInternalInvoices(role: Role) {
  return role === 'ADMIN' || role === 'GERENTE' || role === 'FINANCEIRO';
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  const role = user.role as Role;
  if (!can(role, 'invoices', 'read') || !canReadInternalInvoices(role)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  const [aggregate, countVencidas, countTotal] = await Promise.all([
    prisma.invoice.aggregate({
      where: { empresaId: user.empresaId, status: { notIn: ['CANCELLED'] } },
      _sum: { valorTotal: true, valorPago: true, saldo: true },
    }),
    prisma.invoice.count({
      where: { empresaId: user.empresaId, status: 'OVERDUE' },
    }),
    prisma.invoice.count({
      where: { empresaId: user.empresaId, status: { notIn: ['CANCELLED'] } },
    }),
  ]);

  const totalFaturado = Number(aggregate._sum?.valorTotal ?? 0);
  const totalRecebido = Number(aggregate._sum?.valorPago ?? 0);
  const totalPendente = Number(aggregate._sum?.saldo ?? 0);

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
