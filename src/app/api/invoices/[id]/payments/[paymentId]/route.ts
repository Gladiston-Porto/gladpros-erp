import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { Invoice_status } from '@prisma/client';
import { withErrorHandler } from '@/lib/api/error-handler';

// ── DELETE /api/invoices/[id]/payments/[paymentId] ────────────────────────────
// Estorna (remove) um pagamento e recalcula valorPago / saldo / status da invoice

export const DELETE = withErrorHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string; paymentId: string }> }) => {
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para estornar pagamentos', success: false },
        { status: 403 },
      );
    }
    const { id, paymentId } = await context.params;

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
      select: { id: true, invoiceId: true, valor: true, bankAccountId: true, dataPagamento: true },
    });

    if (!payment || payment.invoiceId !== invoiceId) {
      return NextResponse.json(
        { error: 'Not found', message: 'Pagamento não encontrado', success: false },
        { status: 404 },
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: user.empresaId },
      select: { id: true, status: true, valorPago: true, valorTotal: true, empresaId: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    // Verificar saldo bancário antes de iniciar a transação
    if (payment.bankAccountId) {
      const bankAccount = await prisma.bankAccount.findFirst({
        where: { id: payment.bankAccountId, empresaId: invoice.empresaId },
        select: { id: true, saldoAtual: true },
      });
      if (!bankAccount || Number(bankAccount.saldoAtual) < Number(payment.valor)) {
        return NextResponse.json(
          {
            error: 'Insufficient balance',
            message: 'Saldo bancário insuficiente para estorno',
            success: false,
          },
          { status: 400 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Soft-delete: marcar como estornado
      await tx.invoicePayment.updateMany({
        where: { id: paymentIdInt },
        data: { estornadoEm: new Date(), estornadoPor: Number(user.id) },
      });

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

      // Criar ledger de reversão
      await tx.ledgerTransaction.create({
        data: {
          empresaId: invoice.empresaId,
          sourceType: 'REVERSAL',
          sourceId: paymentIdInt,
          valor: new Decimal(payment.valor),
          entries: { create: [] },
        },
      });

      // Reverter movimentação bancária se houver conta
      if (payment.bankAccountId) {
        await tx.bankTransaction.create({
          data: {
            accountId: payment.bankAccountId,
            empresaId: invoice.empresaId,
            tipo: 'DEBITO',
            categoria: 'INVOICE_PAYMENT_REVERSAL',
            valor: new Decimal(payment.valor),
            descricao: `Estorno pagamento #${paymentIdInt} - Invoice #${invoiceId}`,
            dataTransacao: new Date(),
          },
        });

        await tx.bankAccount.updateMany({
          where: { id: payment.bankAccountId, empresaId: invoice.empresaId },
          data: { saldoAtual: { decrement: Number(payment.valor) } },
        });
      }

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

      await tx.revenue.deleteMany({
        where: {
          empresaId: invoice.empresaId,
          descricao: `Invoice #${invoiceId} - pagamento #${paymentIdInt}`,
          status: 'RECEBIDA',
        },
      });

      return updatedInvoice;
    });

    return NextResponse.json({ data: result, success: true });
  },
);
