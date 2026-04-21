/**
 * POST /api/projetos/[id]/invoices/gerar
 * Gera invoice persistida no banco para um projeto.
 *
 * Requer canViewFinancials (FINANCEIRO ou ADMIN).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProjectPermission } from '@/shared/lib/rbac-projects';
import { getPrismaFinanceGateway } from '@/domains/projects/gateways/prisma-finance.gateway';
import { withErrorHandler } from '@/lib/api/error-handler';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import type { ItemInvoice } from '@/domains/projects/interfaces/finance-gateway.interface';

const bodySchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  dataVencimento: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Data de vencimento inválida' }),
  incluirProposta: z.boolean().default(true),
  incluirMateriais: z.boolean().default(true),
  itensAdicionais: z.array(z.unknown()).default([]),
  desconto: z.number().min(0).max(100).optional(),
  descontoFixo: z.number().min(0).optional(),
  formaPagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export const POST = withErrorHandler(async (req: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
  const { allowed, resetTime } = await apiRateLimit.isAllowed(req);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente em instantes.', success: false },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)) } }
    );
  }

  const user = await requireProjectPermission(req, 'canViewFinancials');

  const { id } = await context.params;
  const projetoId = parseInt(id, 10);
  if (isNaN(projetoId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'ID do projeto inválido', success: false },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Dados inválidos', success: false },
      { status: 400 },
    );
  }

  const { descricao, dataVencimento, incluirProposta, incluirMateriais, itensAdicionais, desconto, descontoFixo, formaPagamento, observacoes } = parsed.data;

  const gateway = getPrismaFinanceGateway();
  const resultado = await gateway.gerarInvoice({
    projetoId,
    usuarioId: parseInt(user.id, 10),
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
