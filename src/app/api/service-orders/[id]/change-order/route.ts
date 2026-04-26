import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { recalculateOSMargin } from '@/shared/services/marginService';
import { randomUUID } from 'crypto';

const changeOrderSchema = z.object({
  newAgreedClientPrice: z.number().positive({ message: 'Valor deve ser positivo' }),
  reason: z.string().min(10, { message: 'Motivo deve ter pelo menos 10 caracteres' }),
});

/**
 * POST /api/service-orders/[id]/change-order
 * Update agreedClientPrice with a mandatory reason. Records AuditLog.
 * RBAC: GERENTE + ADMIN only.
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'service-orders', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
  // Only ADMIN and GERENTE can issue change orders
  if (!['ADMIN', 'GERENTE'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden', message: 'Apenas ADMIN e GERENTE podem emitir change orders', success: false }, { status: 403 });
  }

  const { id } = await params;
  const serviceOrderId = parseInt(id);
  if (isNaN(serviceOrderId)) {
    return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
  }

  const body = changeOrderSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: body.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 }
    );
  }

  const existing = await prisma.serviceOrder.findUnique({
    where: { id: serviceOrderId },
    select: { id: true, agreedClientPrice: true, materialTotal: true, laborTotal: true, orderNumber: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found', message: 'OS não encontrada', success: false }, { status: 404 });
  }

  const oldPrice = existing.agreedClientPrice ? Number(existing.agreedClientPrice) : null;
  const newPrice = body.data.newAgreedClientPrice;

  const updated = await prisma.$transaction(async (tx) => {
    const so = await tx.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { agreedClientPrice: newPrice },
      select: { id: true, agreedClientPrice: true, materialTotal: true, laborTotal: true, orderNumber: true, marginStatus: true },
    });

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        userId: Number(user.id),
        entidade: 'ServiceOrder',
        entidadeId: String(serviceOrderId),
        acao: 'CHANGE_ORDER_AGREED_PRICE',
        diff: JSON.stringify({
          field: 'agreedClientPrice',
          oldValue: oldPrice,
          newValue: newPrice,
          reason: body.data.reason,
          changedBy: user.id,
        }),
      },
    });

    return so;
  });

  // Recalculate margin with new price (non-blocking fire-and-forget)
  recalculateOSMargin(
    serviceOrderId,
    newPrice,
    Number(updated.materialTotal),
    Number(updated.laborTotal),
    updated.orderNumber ?? undefined
  ).catch(() => {/* non-blocking */});

  return NextResponse.json({
    data: updated,
    message: 'Change order registrado com sucesso',
    success: true,
  });
});
