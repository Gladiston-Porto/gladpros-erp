import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser, requireRoles } from '@/shared/lib/rbac';

/**
 * GET /api/backup - Informações de saúde do banco de dados
 * Restrito a administradores
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  requireRoles(user.role, ['ADMIN']);

  // Gather real database stats
  const [
    clienteCount,
    propostaCount,
    projetoCount,
    invoiceCount,
    serviceOrderCount,
    materialCount,
    eventCount,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.proposta.count(),
    prisma.projeto.count(),
    prisma.invoice.count(),
    prisma.serviceOrder.count(),
    prisma.material.count(),
    prisma.domainEvent.count(),
  ]);

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      provider: 'MariaDB',
    },
    counts: {
      clientes: clienteCount,
      propostas: propostaCount,
      projetos: projetoCount,
      invoices: invoiceCount,
      serviceOrders: serviceOrderCount,
      materiais: materialCount,
      events: eventCount,
    },
    note: 'Backups devem ser configurados via cron job externo (mysqldump) ou serviço de cloud.',
  });
});
