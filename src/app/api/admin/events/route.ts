import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// GET /api/admin/events - List domain events (admin only)
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  if (!can(user.role as Role, 'configuracoes', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const name = searchParams.get('name') || undefined;
  const status = searchParams.get('status') || undefined;
  const aggregateType = searchParams.get('aggregateType') || undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (name) where.name = name;
  if (status) where.status = status;
  if (aggregateType) where.aggregateType = aggregateType;

  const [events, total] = await Promise.all([
    prisma.domainEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.domainEvent.count({ where }),
  ]);

  return NextResponse.json({
    data: events.map((e) => ({
      ...e,
      payload: JSON.parse(e.payload),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
