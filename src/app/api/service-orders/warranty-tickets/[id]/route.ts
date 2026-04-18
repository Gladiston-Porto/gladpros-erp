import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { can, requireUser, type Role } from '@/shared/lib/rbac';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['REPORTED', 'INVESTIGATING', 'IN_REPAIR', 'RESOLVED', 'DENIED']).optional(),
  costToRepair: z.number().nonnegative().optional(),
  coveredByWarranty: z.boolean().optional(),
  assignedToWorkerId: z.number().int().positive().nullable().optional(),
  photos: z.array(z.string()).optional(),
  warrantyExpiresAt: z.string().datetime().nullable().optional(),
});

// GET /api/service-orders/warranty-tickets/[id]
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'service-orders', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    );
  }

  const { id } = await params;
  const ticketId = parseInt(id);

  if (isNaN(ticketId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID inválido', success: false },
      { status: 400 }
    );
  }

  const ticket = await prisma.warrantyTicket.findUnique({
    where: { id: ticketId },
    include: {
      cliente: true,
      serviceOrder: { select: { id: true, ticketNumber: true, title: true, status: true } },
      project: { select: { id: true, titulo: true } },
      assignedToWorker: { select: { id: true, name: true } },
      resolvedByUser: { select: { id: true, nomeCompleto: true } }
    }
  });

  if (!ticket) {
    return NextResponse.json(
      { error: 'Not found', message: 'Ticket não encontrado', success: false },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: ticket, success: true }, { status: 200 });
});

// PATCH /api/service-orders/warranty-tickets/[id] - Update ticket
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'service-orders', 'update')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    );
  }

  const { id } = await params;
  const ticketId = parseInt(id);

  if (isNaN(ticketId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID inválido', success: false },
      { status: 400 }
    );
  }

  const existing = await prisma.warrantyTicket.findUnique({ where: { id: ticketId } });
  if (!existing) {
    return NextResponse.json(
      { error: 'Not found', message: 'Ticket não encontrado', success: false },
      { status: 404 }
    );
  }

  const body = updateTicketSchema.safeParse(await request.json());
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
  const data: Record<string, unknown> = {};

  if (validated.title !== undefined) data.title = validated.title;
  if (validated.description !== undefined) data.description = validated.description;
  if (validated.status !== undefined) data.status = validated.status;
  if (validated.costToRepair !== undefined) data.costToRepair = validated.costToRepair;
  if (validated.coveredByWarranty !== undefined) data.coveredByWarranty = validated.coveredByWarranty;
  if (validated.assignedToWorkerId !== undefined) data.assignedToWorkerId = validated.assignedToWorkerId;
  if (validated.photos !== undefined) data.photos = validated.photos;
  if (validated.warrantyExpiresAt !== undefined) {
    data.warrantyExpiresAt = validated.warrantyExpiresAt ? new Date(validated.warrantyExpiresAt) : null;
  }

  // Handle status transitions
  if (validated.status === 'RESOLVED' && !existing.resolvedAt) {
    data.resolvedAt = new Date();
    data.resolvedBy = Number(user.id);
  }

  const updated = await prisma.warrantyTicket.update({
    where: { id: ticketId },
    data,
    include: {
      cliente: { select: { id: true, nomeCompleto: true, nomeFantasia: true } },
      assignedToWorker: { select: { id: true, name: true } }
    }
  });

  return NextResponse.json({ data: updated, success: true }, { status: 200 });
});

// DELETE /api/service-orders/warranty-tickets/[id]
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'service-orders', 'delete')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    );
  }

  const { id } = await params;
  const ticketId = parseInt(id);

  if (isNaN(ticketId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID inválido', success: false },
      { status: 400 }
    );
  }

  const existing = await prisma.warrantyTicket.findUnique({ where: { id: ticketId } });
  if (!existing) {
    return NextResponse.json(
      { error: 'Not found', message: 'Ticket não encontrado', success: false },
      { status: 404 }
    );
  }

  if (!['REPORTED', 'DENIED'].includes(existing.status)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Apenas tickets reportados ou negados podem ser excluídos', success: false },
      { status: 400 }
    );
  }

  await prisma.warrantyTicket.delete({ where: { id: ticketId } });

  return NextResponse.json({ data: { deleted: true }, success: true }, { status: 200 });
});
