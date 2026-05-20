import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { withErrorHandler } from '@/lib/api/error-handler';
import { postLedgerTransaction } from '@/shared/services/ledgerPostingService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function canReadInternalInvoices(role: Role) {
  return role === 'ADMIN' || role === 'GERENTE' || role === 'FINANCEIRO';
}

function mapToFormaPagamento(method: string): string {
  const map: Record<string, string> = {
    BANK_TRANSFER: 'TRANSFERENCIA',
    CHECK: 'CHEQUE',
    CARD: 'CARTAO_CREDITO',
    CASH: 'DINHEIRO',
    STRIPE: 'CARTAO_CREDITO',
    SQUARE: 'CARTAO_CREDITO',
    OTHER: 'TRANSFERENCIA',
  };
  return map[method] ?? 'TRANSFERENCIA';
}

// ── Schema ────────────────────────────────────────────────────────────────────

const createPaymentSchema = z.object({
  valor: z.number().positive(),
  dataPagamento: z.string().datetime(),
  metodoPagamento: z.enum([
    'BANK_TRANSFER',
    'CHECK',
    'CARD',
    'CASH',
    'STRIPE',
    'SQUARE',
    'OTHER',
  ]),
  bankAccountId: z.number().int().positive().optional(),
  referencia: z.string().max(100).optional(),
  notas: z.string().optional(),
  gatewayId: z.string().max(100).optional(),
  gatewayTransactionId: z.string().max(255).optional(),
});

// ── POST /api/invoices/[id]/payments ─────────────────────────────────────────

export const POST = withErrorHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para registrar pagamentos', success: false },
        { status: 403 },
      );
    }
    if (!can(user.role as Role, 'financeiro', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão financeira para registrar pagamentos', success: false },
        { status: 403 },
      );
    }
    const { id } = await context.params;

    const invoiceId = parseInt(id);
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 },
      );
    }

    const raw = await req.json();
    const parsed = createPaymentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: parsed.error.issues[0]?.message ?? 'Dados inválidos',
          success: false,
        },
        { status: 400 },
      );
    }
    const body = parsed.data;

    if (body.gatewayTransactionId) {
      const existingPayment = await prisma.invoicePayment.findFirst({
        where: {
          gatewayTransactionId: body.gatewayTransactionId,
          invoice: { empresaId: user.empresaId },
        },
        select: { id: true, invoiceId: true, valor: true, dataPagamento: true, metodoPagamento: true },
      });

      if (existingPayment) {
        return NextResponse.json(
          { data: { payment: existingPayment }, success: true, idempotent: true },
          { status: 200 }
        );
      }
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: user.empresaId },
      select: { id: true, valorTotal: true, valorPago: true, saldo: true, status: true, clienteId: true, empresaId: true, ledgerTransactionId: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    if (invoice.status === 'DRAFT') {
      return NextResponse.json(
        {
          error: 'Invalid operation',
          message: 'Invoice precisa ser enviada antes de registrar pagamentos',
          success: false,
        },
        { status: 409 },
      );
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        {
          error: 'Invalid operation',
          message: 'Invoice já está totalmente paga',
          success: false,
        },
        { status: 400 },
      );
    }

    if (invoice.status === 'CANCELLED') {
      return NextResponse.json(
        {
          error: 'Invalid operation',
          message: 'Não é possível registrar pagamento em invoice cancelada',
          success: false,
        },
        { status: 400 },
      );
    }

    const saldoAtual = Number(invoice.saldo);
    if (body.valor > saldoAtual + 0.01) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: `Valor (${body.valor}) excede o saldo da invoice (${saldoAtual.toFixed(2)})`,
          success: false,
        },
        { status: 400 },
      );
    }

    if (body.bankAccountId) {
      const bankAccount = await prisma.bankAccount.findFirst({
        where: {
          id: body.bankAccountId,
          empresaId: user.empresaId,
          ativo: true,
        },
        select: { id: true, saldoAtual: true },
      });

      if (!bankAccount) {
        return NextResponse.json(
          { error: 'Not found', message: 'Conta bancária não encontrada ou inativa', success: false },
          { status: 404 },
        );
      }

    }

    const result = await prisma.$transaction(async (tx) => {
      const currentInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, empresaId: user.empresaId },
        select: { id: true, valorTotal: true, valorPago: true, saldo: true, status: true, clienteId: true, empresaId: true, ledgerTransactionId: true },
      });

      if (
        !currentInvoice ||
        currentInvoice.status === 'DRAFT' ||
        currentInvoice.status === 'PAID' ||
        currentInvoice.status === 'CANCELLED'
      ) {
        throw new Error('Invoice não está disponível para pagamento');
      }

      const currentSaldo = Number(currentInvoice.saldo);
      if (body.valor > currentSaldo + 0.01) {
        throw new Error(`Valor (${body.valor}) excede o saldo da invoice (${currentSaldo.toFixed(2)})`);
      }

      const amount = new Decimal(body.valor);
      const settled = await tx.invoice.updateMany({
        where: {
          id: invoiceId,
          empresaId: user.empresaId,
          status: { notIn: ['DRAFT', 'PAID', 'CANCELLED'] },
          saldo: { gte: amount },
        },
        data: {
          valorPago: { increment: amount },
          saldo: { decrement: amount },
          atualizadoPor: Number(user.id),
        },
      });

      if (settled.count !== 1) {
        throw new Error('Invoice não está disponível para pagamento ou saldo insuficiente');
      }

      const afterPaymentInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, empresaId: user.empresaId },
        select: { id: true, valorTotal: true, valorPago: true, saldo: true },
      });

      if (!afterPaymentInvoice) {
        throw new Error('Invoice não encontrada após pagamento');
      }

      const novoStatus = Number(afterPaymentInvoice.saldo) <= 0.01 ? 'PAID' : 'PARTIAL_PAID';

      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId,
          valor: amount,
          dataPagamento: new Date(body.dataPagamento),
          metodoPagamento: body.metodoPagamento,
          bankAccountId: body.bankAccountId,
          referencia: body.referencia,
          notas: body.notas,
          gatewayId: body.gatewayId,
          gatewayTransactionId: body.gatewayTransactionId,
          criadoPor: Number(user.id),
        },
        include: {
          criador: { select: { id: true, nomeCompleto: true, email: true } },
        },
      });

      if (!currentInvoice.ledgerTransactionId) {
        const invoiceLedger = await postLedgerTransaction(
          {
            empresaId: currentInvoice.empresaId,
            data: new Date(body.dataPagamento),
            descricao: `Invoice #${invoiceId} reconhecida`,
            sourceType: 'INVOICE',
            sourceId: invoiceId,
            entries: [
              {
                accountCode: 'ACCOUNTS_RECEIVABLE',
                debit: new Decimal(currentInvoice.valorTotal),
                memo: `Invoice #${invoiceId}`,
              },
              {
                accountCode: 'REVENUE',
                credit: new Decimal(currentInvoice.valorTotal),
                memo: `Invoice #${invoiceId}`,
              },
            ],
          },
          tx
        );

        await tx.invoice.update({
          where: { id: invoiceId },
          data: { ledgerTransactionId: invoiceLedger.id },
          select: { id: true },
        });
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: novoStatus,
          ...(novoStatus === 'PAID' && { dataPagamento: new Date(body.dataPagamento) }),
          atualizadoPor: Number(user.id),
        },
        select: { id: true, status: true, valorPago: true, saldo: true, valorTotal: true },
      });

      if (body.bankAccountId) {
        const amount = new Decimal(body.valor);
        const updatedAccount = await tx.bankAccount.update({
          where: { id: body.bankAccountId },
          data: { saldoAtual: { increment: amount } },
          select: { saldoAtual: true },
        });
        const saldoPosterior = new Decimal(updatedAccount.saldoAtual);

        await tx.bankTransaction.create({
          data: {
            accountId: body.bankAccountId,
            empresaId: currentInvoice.empresaId,
            tipo: 'CREDITO',
            categoria: 'INVOICE_PAYMENT',
            valor: amount,
            descricao: `Pagamento recebido da invoice #${invoiceId}`,
            documento: body.referencia ?? null,
            dataTransacao: new Date(body.dataPagamento),
            saldoAnterior: saldoPosterior.minus(amount),
            saldoPosterior,
            reconciliada: false,
            metadata: {
              invoiceId,
              invoicePaymentId: payment.id,
              metodoPagamento: body.metodoPagamento,
            },
          },
        });
      }

      const paymentLedger = await postLedgerTransaction(
        {
          empresaId: currentInvoice.empresaId,
          data: new Date(body.dataPagamento),
          descricao: `Pagamento da invoice #${invoiceId}`,
          sourceType: 'INVOICE_PAYMENT',
          sourceId: payment.id,
          entries: [
            {
              accountCode: 'CASH',
              debit: new Decimal(body.valor),
              memo: `Pagamento #${payment.id}`,
            },
            {
              accountCode: 'ACCOUNTS_RECEIVABLE',
              credit: new Decimal(body.valor),
              memo: `Baixa de contas a receber da invoice #${invoiceId}`,
            },
          ],
        },
        tx
      );

      await tx.invoicePayment.update({
        where: { id: payment.id },
        data: { ledgerTransactionId: paymentLedger.id },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: Number(user.id),
          entidade: 'InvoicePayment',
          entidadeId: String(payment.id),
          acao: 'CREATE',
          diff: JSON.stringify({
            invoiceId,
            valor: body.valor,
            metodoPagamento: body.metodoPagamento,
            novoStatus,
          }),
        },
      });

      let defaultCategory = await tx.revenueCategory.findFirst({
        where: { empresaId: currentInvoice.empresaId },
        select: { id: true },
      });
      if (!defaultCategory) {
        defaultCategory = await tx.revenueCategory.create({
          data: {
            empresaId: currentInvoice.empresaId,
            nome: 'Pagamentos de Invoice',
            descricao: 'Categoria padrão para receitas geradas por invoices pagas',
            cor: '#0098DA',
          },
          select: { id: true },
        });
      }
      await tx.revenue.create({
        data: {
          empresaId: currentInvoice.empresaId,
          categoriaId: defaultCategory.id,
          clienteId: currentInvoice.clienteId ?? undefined,
          descricao: `Invoice #${invoiceId} - pagamento #${payment.id}`,
          valor: new Decimal(body.valor),
          dataEmissao: new Date(body.dataPagamento),
          dataVencimento: new Date(body.dataPagamento),
          dataPagamento: new Date(body.dataPagamento),
          tipo: 'SERVICO',

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formaPagamento: mapToFormaPagamento(body.metodoPagamento) as any,
          status: 'RECEBIDA',
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json({ data: result, success: true }, { status: 201 });
  },
);

// ── GET /api/invoices/[id]/payments ──────────────────────────────────────────

export const GET = withErrorHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    const role = user.role as Role;
    if (!can(role, 'invoices', 'read') || !canReadInternalInvoices(role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 },
      );
    }
    const { id } = await context.params;

    const invoiceId = parseInt(id);
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 },
      );
    }

    const exists = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: user.empresaId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    const payments = await prisma.invoicePayment.findMany({
      where: { invoiceId, estornadoEm: null },
      orderBy: { dataPagamento: 'desc' },
      take: 100,
      include: {
        criador: { select: { id: true, nomeCompleto: true, email: true } },
      },
    });

    return NextResponse.json({ data: payments, success: true });
  },
);
