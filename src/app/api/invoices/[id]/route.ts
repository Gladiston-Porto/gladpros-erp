import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { withErrorHandler } from '@/lib/api/error-handler';

// ── Schemas ─────────────────────────────────────────────────────────────────

const updateInvoiceSchema = z.object({
  dataVencimento: z.string().datetime().optional(),
  notas: z.string().optional(),
  termos: z.string().optional(),
  status: z
    .enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])
    .optional(),
  taxRateId: z.number().int().positive().optional(),
  descontoValor: z.number().min(0).optional(),
  descontoPercentual: z.number().min(0).max(100).optional(),
  itens: z
    .array(
      z.object({
        tipo: z.enum(['SERVICE', 'MATERIAL', 'EQUIPMENT', 'OTHER']),
        descricao: z.string().min(1).max(500),
        quantidade: z.number().positive(),
        unidade: z.string().min(1).max(50),
        precoUnitario: z.number().nonnegative(),
        desconto: z.number().min(0).default(0),
        taxavel: z.boolean().default(true),
        propostaEtapaId: z.number().int().positive().optional(),
        materialId: z.number().int().positive().optional(),
        ordem: z.number().int().min(0).default(0),
      }),
    )
    .min(1)
    .optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcularTotais<T extends { quantidade: number; precoUnitario: number; desconto: number; taxavel: boolean }>(
  itens: T[],
  descontoValorInput: number,
  descontoPercentualInput: number,
  taxRate: number,
) {
  const itensComSubtotal = itens.map((item) => ({
    ...item,
    subtotal: item.quantidade * item.precoUnitario - item.desconto,
  }));

  const subtotal = itensComSubtotal.reduce((sum, i) => sum + i.subtotal, 0);

  const descontoTotal =
    descontoPercentualInput > 0
      ? subtotal * (descontoPercentualInput / 100)
      : descontoValorInput;

  const subtotalComDesconto = Math.max(0, subtotal - descontoTotal);
  const subtotalTaxavel = itensComSubtotal
    .filter((i) => i.taxavel)
    .reduce((sum, i) => sum + i.subtotal, 0);

  const taxBase =
    subtotal > 0 ? subtotalTaxavel * (subtotalComDesconto / subtotal) : subtotalTaxavel;
  const taxAmount = taxBase * taxRate;

  const valorTotal = subtotalComDesconto + taxAmount;

  return { itensComSubtotal, subtotal, descontoTotal, subtotalComDesconto, taxAmount, valorTotal };
}

// ── GET /api/invoices/[id] ────────────────────────────────────────────────────

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

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: 1 },
      include: {
        cliente: { select: { id: true, nomeCompleto: true, nomeFantasia: true, email: true } },
        projeto: { select: { id: true, titulo: true } },
        itens: { orderBy: { ordem: 'asc' } },
        pagamentos: {
          orderBy: { dataPagamento: 'desc' },
          include: {
            criador: { select: { id: true, nomeCompleto: true, email: true } },
          },
        },
        lembretes: { orderBy: { criadoEm: 'desc' } },
        criador: { select: { id: true, nomeCompleto: true, email: true } },
        atualizador: { select: { id: true, nomeCompleto: true, email: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: invoice, success: true });
  },
);

// ── PUT /api/invoices/[id] ────────────────────────────────────────────────────

export const PUT = withErrorHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para editar invoices', success: false },
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
    const parsed = updateInvoiceSchema.safeParse(raw);
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

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: 1 },
      select: {
        status: true,
        valorPago: true,
        subtotal: true,
        descontoValor: true,
        descontoPercentual: true,
        taxRate: true,
        itens: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    if (['PAID', 'CANCELLED'].includes(existingInvoice.status)) {
      return NextResponse.json(
        {
          error: 'Invalid operation',
          message: 'Não é possível editar invoices pagas ou canceladas',
          success: false,
        },
        { status: 400 },
      );
    }

    const invoice = await prisma.$transaction(async (tx) => {
      let financialUpdate: Record<string, unknown> = {};

      if (body.itens) {
        // Buscar taxRate: do body, ou do existente
        let taxRate = Number(existingInvoice.taxRate);
        if (body.taxRateId) {
          const tr = await tx.taxRate.findUnique({
            where: { id: body.taxRateId, active: true },
          });
          if (tr) taxRate = Number(tr.rate);
        }

        const descontoValorInput = body.descontoValor ?? 0;
        const descontoPercentualInput = body.descontoPercentual ?? 0;

        const { itensComSubtotal, subtotal, descontoTotal, taxAmount, valorTotal } =
          calcularTotais(body.itens, descontoValorInput, descontoPercentualInput, taxRate);

        const novoSaldo = Math.max(0, valorTotal - Number(existingInvoice.valorPago));

        // Deletar itens antigos e recriar
        await tx.invoiceItem.deleteMany({ where: { invoiceId } });
        await tx.invoiceItem.createMany({
          data: itensComSubtotal.map((item) => ({ ...item, invoiceId })),
        });

        financialUpdate = {
          subtotal: new Decimal(subtotal),
          descontoValor: new Decimal(descontoTotal),
          descontoPercentual: new Decimal(descontoPercentualInput),
          taxRate: new Decimal(taxRate),
          taxAmount: new Decimal(taxAmount),
          valorTotal: new Decimal(valorTotal),
          saldo: new Decimal(novoSaldo),
        };
      } else if (body.descontoValor !== undefined || body.descontoPercentual !== undefined) {
        // Recalcular apenas desconto com itens existentes
        const itensExistentes = existingInvoice.itens.map((i) => ({
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
          desconto: Number(i.desconto),
          taxavel: i.taxavel,
        }));

        const descontoValorInput = body.descontoValor ?? 0;
        const descontoPercentualInput = body.descontoPercentual ?? 0;
        const taxRate = Number(existingInvoice.taxRate);

        const { subtotal, descontoTotal, taxAmount, valorTotal } = calcularTotais(
          itensExistentes,
          descontoValorInput,
          descontoPercentualInput,
          taxRate,
        );

        const novoSaldo = Math.max(0, valorTotal - Number(existingInvoice.valorPago));

        financialUpdate = {
          subtotal: new Decimal(subtotal),
          descontoValor: new Decimal(descontoTotal),
          descontoPercentual: new Decimal(descontoPercentualInput),
          taxAmount: new Decimal(taxAmount),
          valorTotal: new Decimal(valorTotal),
          saldo: new Decimal(novoSaldo),
        };
      }

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(body.dataVencimento && { dataVencimento: new Date(body.dataVencimento) }),
          ...(body.notas !== undefined && { notas: body.notas }),
          ...(body.termos !== undefined && { termos: body.termos }),
          ...(body.status && { status: body.status }),
          ...financialUpdate,
          atualizadoPor: Number(user.id),
        },
        include: {
          cliente: { select: { id: true, nomeCompleto: true, nomeFantasia: true, email: true } },
          projeto: { select: { id: true, titulo: true } },
          itens: { orderBy: { ordem: 'asc' } },
          pagamentos: { orderBy: { dataPagamento: 'desc' } },
        },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: Number(user.id),
          entidade: 'Invoice',
          entidadeId: String(invoiceId),
          acao: 'UPDATE',
          diff: JSON.stringify({ changes: Object.keys({ ...body, ...financialUpdate }) }),
        },
      });

      return updated;
    });

    return NextResponse.json({ data: invoice, success: true });
  },
);

// ── DELETE /api/invoices/[id] ─────────────────────────────────────────────────

export const DELETE = withErrorHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const user = await requireUser(req);
    if (!can(user.role as Role, 'invoices', 'delete')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para excluir invoices', success: false },
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

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, empresaId: 1 },
      select: { id: true, status: true, valorPago: true, numeroInvoice: true },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Not found', message: 'Invoice não encontrada', success: false },
        { status: 404 },
      );
    }

    if (existingInvoice.status === 'PAID' || Number(existingInvoice.valorPago) > 0) {
      return NextResponse.json(
        {
          error: 'Invalid operation',
          message: 'Não é possível excluir invoices com pagamentos registrados',
          success: false,
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'CANCELLED', atualizadoPor: Number(user.id) },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: Number(user.id),
          entidade: 'Invoice',
          entidadeId: String(invoiceId),
          acao: 'DELETE',
          diff: JSON.stringify({
            numeroInvoice: existingInvoice.numeroInvoice,
            statusAnterior: existingInvoice.status,
          }),
        },
      });
    });

    return NextResponse.json({ data: { id: invoiceId }, success: true });
  },
);
