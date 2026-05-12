import { NextRequest, NextResponse } from 'next/server';
import { requireUser, can, type Role } from '@/shared/lib/rbac';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { withErrorHandler } from '@/lib/api/error-handler';
import type { Prisma } from '@prisma/client';

// ── Schemas ─────────────────────────────────────────────────────────────────

const createInvoiceSchema = z.object({
  clienteId: z.number().int().positive(),
  projetoId: z.number().int().positive().optional(),
  dataVencimento: z.string().datetime(),
  notas: z.string().optional(),
  termos: z.string().optional(),
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
    .min(1),
  taxRateId: z.number().int().positive().optional(),
  descontoValor: z.number().min(0).default(0),
  descontoPercentual: z.number().min(0).max(100).default(0),
});

const filterInvoiceSchema = z.object({
  clienteId: z.string().optional(),
  projetoId: z.string().optional(),
  status: z
    .enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])
    .optional(),
  search: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
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

  // Desconto aplicado proporcionalmente à base tributável
  const taxBase =
    subtotal > 0 ? subtotalTaxavel * (subtotalComDesconto / subtotal) : subtotalTaxavel;
  const taxAmount = taxBase * taxRate;

  const valorTotal = subtotalComDesconto + taxAmount;

  return { itensComSubtotal, subtotal, descontoTotal, subtotalComDesconto, taxAmount, valorTotal };
}

// ── POST /api/invoices ────────────────────────────────────────────────────────

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!can(user.role as Role, 'invoices', 'create')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para criar invoices', success: false },
      { status: 403 },
    );
  }

  const raw = await req.json();
  const parsed = createInvoiceSchema.safeParse(raw);
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

  // Buscar TaxRate (ou usar default Texas 8.25%)
  let taxRate = 0.0825;
  if (body.taxRateId) {
    const tr = await prisma.taxRate.findUnique({ where: { id: body.taxRateId, active: true } });
    if (tr) taxRate = Number(tr.rate);
  }

   
  const { itensComSubtotal, subtotal, descontoTotal, subtotalComDesconto: _subtotalComDesconto, taxAmount, valorTotal } =
    calcularTotais(body.itens, body.descontoValor, body.descontoPercentual, taxRate);

  // Gerar número único da invoice em transação serializada
  const hoje = new Date();
  const dataStr = hoje.toISOString().split('T')[0].replace(/-/g, '');

  const invoice = await prisma.$transaction(async (tx) => {
    const count = await tx.invoice.count({
      where: { numeroInvoice: { startsWith: `INV-${dataStr}` } },
    });
    const numeroInvoice = `INV-${dataStr}-${String(count + 1).padStart(4, '0')}`;

    const created = await tx.invoice.create({
      data: {
        numeroInvoice,
        clienteId: body.clienteId,
        projetoId: body.projetoId,
        dataVencimento: new Date(body.dataVencimento),
        subtotal: new Decimal(subtotal),
        descontoValor: new Decimal(descontoTotal),
        descontoPercentual: new Decimal(body.descontoPercentual),
        taxRate: new Decimal(taxRate),
        taxAmount: new Decimal(taxAmount),
        valorTotal: new Decimal(valorTotal),
        valorPago: new Decimal(0),
        saldo: new Decimal(valorTotal),
        status: 'DRAFT',
        notas: body.notas,
        termos: body.termos,
        criadoPor: Number(user.id),
        empresaId: 1,
        itens: { create: itensComSubtotal },
      },
      include: {
        cliente: { select: { nomeCompleto: true, nomeFantasia: true, email: true } },
        projeto: { select: { titulo: true } },
        itens: true,
      },
    });

    await tx.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: 'Invoice',
        entidadeId: String(created.id),
        acao: 'CREATE',
        diff: JSON.stringify({ numeroInvoice, clienteId: body.clienteId, valorTotal }),
      },
    });

    return created;
  });

  return NextResponse.json({ data: invoice, success: true }, { status: 201 });
});

// ── GET /api/invoices ─────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser(req);
  if (!can(user.role as Role, 'invoices', 'read')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = filterInvoiceSchema.safeParse({
    clienteId: searchParams.get('clienteId') ?? undefined,
    projetoId: searchParams.get('projetoId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    dataInicio: searchParams.get('dataInicio') ?? undefined,
    dataFim: searchParams.get('dataFim') ?? undefined,
    page: searchParams.get('page') ?? 1,
    limit: searchParams.get('limit') ?? 20,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Filtros inválidos', success: false },
      { status: 400 },
    );
  }
  const filters = parsed.data;
  const skip = (filters.page - 1) * filters.limit;

  const where: Prisma.InvoiceWhereInput = { empresaId: 1 };

  if (filters.clienteId) where.clienteId = parseInt(filters.clienteId);
  if (filters.projetoId) where.projetoId = parseInt(filters.projetoId);
  if (filters.status) where.status = filters.status;

  if (filters.search) {
    where.OR = [
      { numeroInvoice: { contains: filters.search } },
      { cliente: { nomeCompleto: { contains: filters.search } } },
      { cliente: { nomeFantasia: { contains: filters.search } } },
      { projeto: { titulo: { contains: filters.search } } },
    ];
  }

  if (filters.dataInicio || filters.dataFim) {
    where.dataVencimento = {
      ...(filters.dataInicio && { gte: new Date(filters.dataInicio) }),
      ...(filters.dataFim && { lte: new Date(filters.dataFim) }),
    };
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { criadoEm: 'desc' },
      include: {
        cliente: { select: { nomeCompleto: true, nomeFantasia: true, email: true } },
        projeto: { select: { titulo: true } },
        itens: { select: { id: true, descricao: true, subtotal: true } },
        _count: { select: { pagamentos: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    data: invoices,
    pagination: {
      page: filters.page,
      pageSize: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
    success: true,
  });
});
