import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';

/**
 * GET /api/webhooks - Listar eventos recentes como webhook log
 * Usa a tabela domain_events como fonte de dados real
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);

  const events = await prisma.domainEvent.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      aggregateType: true,
      aggregateId: true,
      status: true,
      occurredAt: true,
      processedAt: true,
    },
  });

  const webhookLog = events.map((e) => ({
    id: String(e.id),
    event: e.name,
    aggregateType: e.aggregateType,
    aggregateId: e.aggregateId,
    status: e.status,
    occurredAt: e.occurredAt.toISOString(),
    processedAt: e.processedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ webhooks: webhookLog, total: webhookLog.length });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request);
  return NextResponse.json(
    { error: 'Criação manual de webhooks não disponível. Use o Event Bus do sistema.' },
    { status: 501 }
  );
});
