import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireRoles } from '@/shared/lib/rbac';

/**
 * GET /api/monitoring/metrics - Métricas reais do sistema
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    requireRoles(user.role, ['ADMIN']);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      totalClientes,
      totalPropostas,
      eventosHoje,
      eventosTotal,
      eventosFailed,
      invoicesTotal,
      invoicesPagas,
    ] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { status: 'ATIVO' } }),
      prisma.cliente.count({ where: { status: 'ATIVO' } }),
      prisma.proposta.count({ where: { deletedAt: null } }),
      prisma.domainEvent.count({ where: { occurredAt: { gte: today } } }),
      prisma.domainEvent.count(),
      prisma.domainEvent.count({ where: { status: 'FAILED' } }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
    ]);

    return NextResponse.json({
      timestamp: now.toISOString(),
      users: { total: totalUsers, active: activeUsers },
      clientes: { total: totalClientes },
      propostas: { total: totalPropostas },
      invoices: { total: invoicesTotal, pagas: invoicesPagas },
      events: {
        total: eventosTotal,
        today: eventosHoje,
        failed: eventosFailed,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 });
  }
}
