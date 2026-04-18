import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { Invoice_status } from '@prisma/client';
import { withErrorHandler } from '@/lib/api/error-handler';

// ── DELETE /api/invoices/[id]/payments/[paymentId] ────────────────────────────
// Estorna (remove) um pagamento e recalcula valorPago / saldo / status da invoice

export const DELETE = withErrorHandler(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string; paymentId: string }> },
  ) => {
    const { id, paymentId } = await context.params;
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para estornar pagamentos', success: false },
        { status: 403 },
      );
    }

    const invoiceId = parseInt(id);
    const paymentIdInt = parseInt(paymentId);

    if (isNaN(invoiceId) || isNaN(paymentIdInt)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 },
      );
    }

    const payment = await prisma.invoicePayment.findUnique({
      where: { id: paymentIdInt },
      select: { id: true, invoiceId: true, valor: true },
    });

    if (!payment || payment.invoiceId !== invoiceId) {
      return NextResponse.json(
        { error: 'Not found', message: 'Pagamento não encontrado', success: false },
        { status: 404 },
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, valorPago: true, valorTotal: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.delete({ where: { id: paymentIdInt } });

      const novoValorPago = Math.max(0, Number(invoice.valorPago) - Number(payment.valor));
      const novoSaldo = Math.max(0, Number(invoice.valorTotal) - novoValorPago);
      let novoStatus: Invoice_status;
      if (novoValorPago <= 0.005) {
        novoStatus = invoice.status === 'OVERDUE' ? 'OVERDUE' : 'DRAFT';
      } else {
        novoStatus = 'PARTIAL_PAID';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          valorPago: new Decimal(novoValorPago),
          saldo: new Decimal(novoSaldo),
          status: novoStatus,
          dataPagamento: null,
          atualizadoPor: Number(user.id),
        },
        select: { id: true, status: true, valorPago: true, saldo: true, valorTotal: true },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: Number(user.id),
          entidade: 'InvoicePayment',
          entidadeId: String(paymentIdInt),
          acao: 'DELETE',
          diff: JSON.stringify({
            invoiceId,
            valorEstornado: Number(payment.valor),
            novoStatus,
          }),
        },
      });

      return updatedInvoice;
    });

    return NextResponse.json({ data: result, success: true });
  },
);
