/**
 * POST /api/projetos/[id]/invoices/gerar
 * Gera invoice persistida no banco para um projeto.
 *
 * Requer canViewFinancials (FINANCEIRO ou ADMIN).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { can, type Role } from '@/shared/lib/rbac-core';
import { getPrismaFinanceGateway } from '@/domains/projects/gateways/prisma-finance.gateway';
import { withErrorHandler } from '@/lib/api/error-handler';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import type { ItemInvoice, TipoFaturamentoProjeto } from '@/domains/projects/interfaces/finance-gateway.interface';

const itemInvoiceSchema = z.object({
  descricao: z.string().trim().min(1, 'Descrição do item é obrigatória').max(500),
  tipo: z.enum(['MATERIAL', 'SERVICE']),
  quantidade: z.number().positive('Quantidade deve ser maior que 0'),
  valorUnitario: z.number().nonnegative('Valor unitário não pode ser negativo'),
  valorTotal: z.number().nonnegative('Valor total não pode ser negativo'),
}).refine(
  (item) => Math.abs(item.quantidade * item.valorUnitario - item.valorTotal) < 0.01,
  { message: 'valorTotal deve bater com quantidade * valorUnitario' }
);

const bodySchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  dataVencimento: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Data de vencimento inválida' }),
  billingType: z.enum(['DEPOSIT', 'PROGRESS', 'MILESTONE', 'MATERIALS', 'SERVICE_ORDER', 'FINAL']).default('PROGRESS'),
  billingReference: z.string().trim().min(1).max(100).optional(),
  serviceOrderId: z.number().int().positive().optional(),
  incluirProposta: z.boolean().default(true),
  incluirMateriais: z.boolean().default(true),
  itensAdicionais: z.array(itemInvoiceSchema).max(100).default([]),
  desconto: z.number().min(0).max(100).optional(),
  descontoFixo: z.number().min(0).optional(),
  formaPagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export const POST = withErrorHandler(async (req: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
  const user = await requireProjectPermission(req, 'canViewFinancials');
  if (!can(user.role as Role, 'invoices', 'create')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão para gerar invoice', success: false },
      { status: 403 },
    );
  }

  const { allowed, resetTime } = await apiRateLimit.isAllowed(req);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente em instantes.', success: false },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)) } }
    );
  }

  const { id } = await context.params;
  const projetoId = parseInt(id, 10);
  if (isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 },
    );
  }
  await requireProjectAccess(user, projetoId, 'canViewFinancials');

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 },
    );
  }

  const {
    descricao,
    dataVencimento,
    billingType,
    billingReference,
    serviceOrderId,
    incluirProposta,
    incluirMateriais,
    itensAdicionais,
    desconto,
    descontoFixo,
    formaPagamento,
    observacoes,
  } = parsed.data;

  const gateway = getPrismaFinanceGateway();
  const resultado = await gateway.gerarInvoice({
    empresaId: user.empresaId,
    projetoId,
    usuarioId: parseInt(user.id, 10),
    billingType: billingType as TipoFaturamentoProjeto,
    billingReference,
    serviceOrderId,
    descricao,
    dataVencimento: new Date(dataVencimento),
    incluirProposta,
    incluirMateriais,
    itensAdicionais: itensAdicionais as ItemInvoice[],
    desconto,
    descontoFixo,
    formaPagamento: formaPagamento as never,
    observacoes,
  });

  if (!resultado.sucesso) {
    return NextResponse.json(
      { error: 'Bad request', message: resultado.mensagem, success: false },
      { status: 400 },
    );
  }

  const invoice = await gateway.buscarInvoice(resultado.invoiceId!);
  if (!invoice) {
    return NextResponse.json(
      { error: 'Internal error', message: 'Erro ao buscar invoice gerado', success: false },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: {
        invoiceId: invoice.id,
        numeroInvoice: invoice.numeroInvoice,
        projetoId: invoice.projetoId,
        numeroProjeto: invoice.numeroProjeto,
        clienteNome: invoice.clienteNome,
        status: invoice.status,
        descricao: invoice.descricao,
        dataEmissao: invoice.dataEmissao,
        dataVencimento: invoice.dataVencimento,
        itens: invoice.itens,
        subtotal: invoice.subtotal,
        desconto: invoice.desconto,
        valorTotal: invoice.valorTotal,
        valorPago: invoice.valorPago,
        observacoes: invoice.observacoes,
        criadoEm: invoice.criadoEm,
      },
      success: true,
    },
    { status: 201 },
  );
});
