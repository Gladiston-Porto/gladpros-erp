import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { Invoice_status } from '@prisma/client';
import { withErrorHandler } from '@/lib/api/error-handler';
import { postLedgerTransaction } from '@/shared/services/ledgerPostingService';

// ── DELETE /api/invoices/[id]/payments/[paymentId] ────────────────────────────
// Estorna um pagamento preservando o registro original para auditoria.

export const DELETE = withErrorHandler(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string; paymentId: string }> },
  ) => {
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para estornar pagamentos', success: false },
        { status: 403 },
      );
    }
    if (!can(user.role as Role, 'financeiro', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão financeira para estornar pagamentos', success: false },
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
      select: { id: true, invoiceId: true, valor: true, dataPagamento: true, bankAccountId: true, estornadoEm: true },
    });

    if (!payment || payment.invoiceId !== invoiceId || payment.estornadoEm) {
      return NextResponse.json(
        { error: 'Not found', message: 'Pagamento não encontrado', success: false },
        { status: 404 },
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: user.empresaId },
      select: { id: true, status: true, valorPago: true, valorTotal: true, empresaId: true, dataPagamento: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    if (payment.bankAccountId) {
      const bankAccount = await prisma.bankAccount.findFirst({
        where: { id: payment.bankAccountId, empresaId: user.empresaId, ativo: true },
        select: { id: true, saldoAtual: true },
      });

      if (!bankAccount) {
        return NextResponse.json(
          { error: 'Not found', message: 'Conta bancária do pagamento não encontrada ou inativa', success: false },
          { status: 404 },
        );
      }

      const saldoAnterior = new Decimal(bankAccount.saldoAtual);
      const valorEstorno = new Decimal(payment.valor);
      if (saldoAnterior.lt(valorEstorno)) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'Saldo bancário insuficiente para estornar este pagamento', success: false },
          { status: 400 },
        );
      }

    }

    const result = await prisma.$transaction(async (tx) => {
      const reversed = await tx.invoicePayment.updateMany({
        where: { id: paymentIdInt, invoiceId, estornadoEm: null },
        data: {
          estornadoEm: new Date(),
          estornadoPor: Number(user.id),
          motivoEstorno: `Estorno registrado por ${user.email}`,
        },
      });

      if (reversed.count !== 1) {
        throw new Error('Pagamento já estornado ou indisponível para estorno');
      }

      const amount = new Decimal(payment.valor);
      const balanceAdjusted = await tx.invoice.updateMany({
        where: {
          id: invoiceId,
          empresaId: user.empresaId,
          valorPago: { gte: amount },
        },
        data: {
          valorPago: { decrement: amount },
          saldo: { increment: amount },
          atualizadoPor: Number(user.id),
        },
      });

      if (balanceAdjusted.count !== 1) {
        throw new Error('Saldo da invoice foi alterado durante o estorno');
      }

      const adjustedInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, empresaId: user.empresaId },
        select: { id: true, status: true, valorPago: true, saldo: true, valorTotal: true, dataPagamento: true },
      });

      if (!adjustedInvoice) {
        throw new Error('Invoice não encontrada após estorno');
      }

      let novoStatus: Invoice_status;
      if (Number(adjustedInvoice.valorPago) <= 0.005) {
        novoStatus = invoice.status === 'OVERDUE' ? 'OVERDUE' : 'SENT';
      } else {
        novoStatus = 'PARTIAL_PAID';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: novoStatus,
          dataPagamento: Number(adjustedInvoice.valorPago) <= 0.005 ? null : adjustedInvoice.dataPagamento,
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
          acao: 'INVOICE_PAYMENT_REVERSED',
          diff: JSON.stringify({
            invoiceId,
            valorEstornado: Number(payment.valor),
            novoStatus,
          }),
        },
      });

      await postLedgerTransaction(
        {
          empresaId: invoice.empresaId,
          data: new Date(),
          descricao: `Estorno do pagamento #${paymentIdInt} da invoice #${invoiceId}`,
          sourceType: 'REVERSAL',
          sourceId: paymentIdInt,
          entries: [
            {
              accountCode: 'ACCOUNTS_RECEIVABLE',
              debit: new Decimal(payment.valor),
              memo: `Reabertura de saldo da invoice #${invoiceId}`,
            },
            {
              accountCode: 'CASH',
              credit: new Decimal(payment.valor),
              memo: `Estorno de caixa do pagamento #${paymentIdInt}`,
            },
          ],
        },
        tx
      );

      if (payment.bankAccountId) {
        const amount = new Decimal(payment.valor);
        const debited = await tx.bankAccount.updateMany({
          where: { id: payment.bankAccountId, empresaId: invoice.empresaId, saldoAtual: { gte: amount } },
          data: { saldoAtual: { decrement: amount } },
        });

        if (debited.count !== 1) {
          throw new Error('Saldo bancário insuficiente para estornar este pagamento');
        }

        const updatedAccount = await tx.bankAccount.findUniqueOrThrow({
          where: { id: payment.bankAccountId },
          select: { saldoAtual: true },
        });
        const saldoPosterior = new Decimal(updatedAccount.saldoAtual);

        await tx.bankTransaction.create({
          data: {
            accountId: payment.bankAccountId,
            empresaId: invoice.empresaId,
            tipo: 'DEBITO',
            categoria: 'INVOICE_PAYMENT_REVERSAL',
            valor: amount,
            descricao: `Estorno do pagamento #${paymentIdInt} da invoice #${invoiceId}`,
            documento: null,
            dataTransacao: new Date(),
            saldoAnterior: saldoPosterior.plus(amount),
            saldoPosterior,
            reconciliada: false,
            metadata: {
              invoiceId,
              invoicePaymentId: paymentIdInt,
            },
          },
        });
      }

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
