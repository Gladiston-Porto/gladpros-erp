import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { withErrorHandler } from '@/lib/api/error-handler';

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
    const { id } = await context.params;
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para registrar pagamentos', success: false },
        { status: 403 },
      );
    }

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

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, valorTotal: true, valorPago: true, saldo: true, status: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
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

    const novoValorPago = Number(invoice.valorPago) + body.valor;
    const novoSaldo = Math.max(0, Number(invoice.valorTotal) - novoValorPago);
    const novoStatus = novoSaldo <= 0.01 ? 'PAID' : 'PARTIAL_PAID';

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId,
          valor: new Decimal(body.valor),
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

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          valorPago: new Decimal(novoValorPago),
          saldo: new Decimal(novoSaldo),
          status: novoStatus,
          ...(novoStatus === 'PAID' && { dataPagamento: new Date(body.dataPagamento) }),
          atualizadoPor: Number(user.id),
        },
        select: { id: true, status: true, valorPago: true, saldo: true, valorTotal: true },
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

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json({ data: result, success: true }, { status: 201 });
  },
);

// ── GET /api/invoices/[id]/payments ──────────────────────────────────────────

export const GET = withErrorHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'read')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 },
      );
    }

    const invoiceId = parseInt(id);
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'ID inválido', success: false },
        { status: 400 },
      );
    }

    const exists = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    const payments = await prisma.invoicePayment.findMany({
      where: { invoiceId },
      orderBy: { dataPagamento: 'desc' },
      include: {
        criador: { select: { id: true, nomeCompleto: true, email: true } },
      },
    });

    return NextResponse.json({ data: payments, success: true });
  },
);
