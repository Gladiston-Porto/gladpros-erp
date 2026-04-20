import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { z } from 'zod';

/**
 * POST /api/webhooks/invoice-paid
 *
 * Webhook triggered when an invoice is marked as PAID.
 * Automatically closes the associated Service Order (AWAITING_PAYMENT → CLOSED).
 *
 * Security: Requires Bearer token matching INVOICE_WEBHOOK_SECRET env var.
 *
 * This can be called from:
 * - Payment gateway webhooks (Stripe, etc.)
 * - Manual invoice status update in the system
 * - Scheduled job that checks for paid invoices
 */

const bodySchema = z.object({
  invoiceId: z.union([z.string(), z.number()]).transform(Number),
  source: z.string().default('manual'),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Verify shared secret — prevents unauthenticated callers from closing Service Orders
  const secret = process.env.INVOICE_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== secret) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token inválido ou ausente', success: false },
        { status: 401 },
      );
    }
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 },
    );
  }

  const { invoiceId, source } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      numeroInvoice: true,
      status: true,
      ServiceOrder: {
        select: {
          id: true,
          ticketNumber: true,
          status: true,
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: 'Not found', message: 'Invoice não encontrada', success: false },
      { status: 404 },
    );
  }

  if (invoice.status !== 'PAID') {
    return NextResponse.json({
      data: { invoiceId: invoice.id, action: 'skipped', reason: `status=${invoice.status}` },
      success: true,
    });
  }

  if (!invoice.ServiceOrder) {
    return NextResponse.json({
      data: { invoiceId: invoice.id, action: 'skipped', reason: 'no_service_order' },
      success: true,
    });
  }

  const serviceOrder = invoice.ServiceOrder;

  if (serviceOrder.status !== 'AWAITING_PAYMENT') {
    return NextResponse.json({
      data: { invoiceId: invoice.id, serviceOrderId: serviceOrder.id, action: 'skipped', reason: `so_status=${serviceOrder.status}` },
      success: true,
    });
  }

  await prisma.serviceOrder.update({
    where: { id: serviceOrder.id },
    data: { status: 'CLOSED', closedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: 0,
      entidade: 'ServiceOrder',
      entidadeId: String(serviceOrder.id),
      acao: 'UPDATE',
      diff: JSON.stringify({
        trigger: 'invoice-paid-webhook',
        invoiceId,
        previousStatus: 'AWAITING_PAYMENT',
        newStatus: 'CLOSED',
        source,
      }),
    },
  });

  return NextResponse.json({
    data: {
      invoiceId: invoice.id,
      serviceOrderId: serviceOrder.id,
      action: 'closed',
      ticketNumber: serviceOrder.ticketNumber,
      previousStatus: 'AWAITING_PAYMENT',
      newStatus: 'CLOSED',
      source,
    },
    success: true,
  });
});

