import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';
import { z } from 'zod';

const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  clienteId: z.number().int().positive(),
  serviceOrderId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  photos: z.array(z.string()).optional(),
  warrantyExpiresAt: z.string().datetime().optional(),
});

// GET /api/service-orders/warranty-tickets - List warranty tickets
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'service-orders', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    );
  }
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
  const status = searchParams.get('status');
  const clienteId = searchParams.get('clienteId');
  const search = searchParams.get('search');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;
  if (clienteId) where.clienteId = parseInt(clienteId);
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.warrantyTicket.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { reportedAt: 'desc' },
      include: {
        cliente: { select: { id: true, nomeCompleto: true, nomeFantasia: true, email: true } },
        serviceOrder: { select: { id: true, ticketNumber: true, title: true } },
        assignedToWorker: { select: { id: true, name: true } }
      }
    }),
    prisma.warrantyTicket.count({ where })
  ]);

  return NextResponse.json({
    data: items,
    pagination: { total, page, pageSize, hasNext: page * pageSize < total },
    success: true
  });
});

// POST /api/service-orders/warranty-tickets - Create warranty ticket
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'service-orders', 'create')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    );
  }

  const raw = await request.json();
  const body = createTicketSchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: body.error.issues[0]?.message ?? 'Dados inválidos',
        success: false,
      },
      { status: 400 }
    );
  }
  const validated = body.data;

  const ticket = await prisma.warrantyTicket.create({
    data: {
      title: validated.title,
      description: validated.description,
      clienteId: validated.clienteId,
      serviceOrderId: validated.serviceOrderId,
      projectId: validated.projectId,
      photos: validated.photos || [],
      warrantyExpiresAt: validated.warrantyExpiresAt ? new Date(validated.warrantyExpiresAt) : null,
      status: 'REPORTED',
    },
    include: {
      cliente: { select: { id: true, nomeCompleto: true, nomeFantasia: true } },
      serviceOrder: { select: { id: true, ticketNumber: true } }
    }
  });

  return NextResponse.json({ data: ticket, success: true }, { status: 201 });
});
