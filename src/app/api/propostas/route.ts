
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adaptPropostaFormToAPI } from "@/components/propostas/adapter";
import { PropostaFormData } from "@/components/propostas/types";
import { withErrorHandler } from '@/lib/api/error-handler';
import { createPropostaSchema } from '@/schemas/proposta.schema';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { generateNumeroProposta } from '@/shared/lib/services/proposta-numbering';
import { calculateInvoiceTax } from '@/shared/services/salesTaxService';
import type { Prisma, Proposta_gatilhoFaturamento, Proposta_formaPagamentoPreferida, Proposta_status, PropostaMaterial_status, PropostaEtapa_status, PropertyType, ServiceCategory, ContractType, TaxMode } from '@prisma/client';

/** Normaliza texto livre de forma de pagamento para o enum do Prisma. */
function normalizeFormaPagamento(value?: string): Proposta_formaPagamentoPreferida | undefined {
  if (!value) return undefined;
  const map: Record<string, Proposta_formaPagamentoPreferida> = {
    'invoice': 'INVOICE', 'check': 'CHECK', 'cheque': 'CHEQUE',
    'ach': 'ACH', 'ach transfer': 'ACH', 'wire': 'TRANSFERENCIA',
    'credit card': 'CREDIT_CARD', 'cartao': 'CARTAO', 'card': 'CREDIT_CARD',
    'pix': 'PIX', 'boleto': 'BOLETO', 'cash': 'DINHEIRO', 'dinheiro': 'DINHEIRO',
    'transferencia': 'TRANSFERENCIA', 'transfer': 'TRANSFERENCIA',
  };
  const normalized = map[value.toLowerCase().trim()];
  // Se já é um valor válido do enum, aceita direto
  const validValues: Proposta_formaPagamentoPreferida[] = ['PIX','CARTAO','BOLETO','TRANSFERENCIA','DINHEIRO','CHEQUE','INVOICE','CHECK','ACH','CREDIT_CARD'];
  if (validValues.includes(value as Proposta_formaPagamentoPreferida)) return value as Proposta_formaPagamentoPreferida;
  return normalized; // undefined se não mapeado (campo é opcional)
}

/** Compute TX sales tax for a proposal and return fields ready for Prisma upsert. */
function computePropostaTax(payload: {
  valorEstimado: number;
  propertyType?: string | null;
  serviceCategory?: string | null;
  contractType?: string | null;
  serviceAddressState?: string | null;
}) {
  const result = calculateInvoiceTax({
    subtotal: payload.valorEstimado || 0,
    classification: {
      propertyType: (payload.propertyType as PropertyType) ?? null,
      serviceCategory: (payload.serviceCategory as ServiceCategory) ?? null,
      contractType: (payload.contractType as ContractType) ?? null,
      serviceAddressState: payload.serviceAddressState ?? 'TX',
    },
  });
  return {
    taxScenario: result.scenario,
    taxMode: result.taxMode as TaxMode,
    taxRate: result.taxRate,
    taxAmount: result.taxAmount,
    taxExplanation: result.taxExplanation,
    taxRequiresReview: result.requiresManualReview,
  };
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'read')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10')));
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const clienteId = searchParams.get('clienteId');

  const sortKey = searchParams.get('sortKey') ?? 'criadoEm';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  // Whitelist to prevent Prisma injection — same pattern as OS module
  const SORT_WHITELIST: Record<string, Prisma.PropostaOrderByWithRelationInput> = {
    criadoEm:       { criadoEm: sortDir },
    numeroProposta: { numeroProposta: sortDir },
    titulo:         { titulo: sortDir },
    status:         { status: sortDir },
    valorEstimado:  { valorEstimado: sortDir },
    valor:          { valorEstimado: sortDir }, // alias used by frontend
    cliente:        { Cliente: { nomeCompleto: sortDir } },
  };
  const orderBy = SORT_WHITELIST[sortKey] ?? SORT_WHITELIST['criadoEm'];

  const where: Prisma.PropostaWhereInput = { deletedAt: null };
  if (status) where.status = status as Proposta_status;
  if (clienteId) where.clienteId = parseInt(clienteId);
  if (search) {
    where.OR = [
      { numeroProposta: { contains: search } },
      { titulo: { contains: search } },
      { Cliente: { nomeCompleto: { contains: search } } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.proposta.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: {
        Cliente: { select: { id: true, nomeCompleto: true, email: true } },
        _count: { select: { PropostaMaterial: true, PropostaEtapa: true, AnexoProposta: true } }
      }
    }),
    prisma.proposta.count({ where })
  ]);

  const mapped = items.map((p) => {
    const now = Date.now();
    const diasAteVencimento = p.validadeProposta
      ? Math.ceil((new Date(p.validadeProposta).getTime() - now) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: p.id,
      numeroProposta: p.numeroProposta,
      titulo: p.titulo,
      status: p.status,
      valorEstimado: p.valorEstimado ? Number(p.valorEstimado) : null,
      criadoEm: p.criadoEm,
      validadeProposta: p.validadeProposta ?? null,
      diasAteVencimento,
      aprovacaoInternaFinanceira: p.aprovacaoInternaFinanceira ?? false,
      aprovacaoInternaTecnica: p.aprovacaoInternaTecnica ?? false,
      cliente: p.Cliente ? { id: p.Cliente.id, nome: p.Cliente.nomeCompleto, email: p.Cliente.email } : null,
      etapasCount: p._count?.PropostaEtapa ?? 0,
      materiaisCount: p._count?.PropostaMaterial ?? 0,
      anexosCount: p._count?.AnexoProposta ?? 0
    };
  });

  return NextResponse.json({
    data: mapped,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
    },
    success: true,
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const rl = await apiRateLimit.isAllowed(request);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: rl.message, success: false },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.resetTime.toString() } }
      );
    }
    const user = await requireUser(request);
    if (!can(user.role as Role, 'propostas', 'create')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const body = createPropostaSchema.parse(await request.json()) as unknown as PropostaFormData
    const payload = adaptPropostaFormToAPI(body);
    try {
    const numeroProposta = await generateNumeroProposta();
    const taxFields = computePropostaTax({
      valorEstimado: payload.valorEstimado,
      propertyType: payload.propertyType,
      serviceCategory: payload.serviceCategory,
      contractType: payload.contractType,
      serviceAddressState: payload.serviceAddressState,
    });

    const newProposta = await prisma.proposta.create({
      data: ({
        numeroProposta,
        clienteId: payload.clienteId,
        titulo: payload.titulo || 'Sem título',
        tipoServico: (payload.serviceCategory as string) ?? 'GENERAL',
        descricaoEscopo: payload.descricao || '',
        valorEstimado: payload.valorEstimado,
        status: payload.status,
        contatoNome: payload.contatoNome,
        contatoEmail: payload.contatoEmail,
        contatoTelefone: payload.contatoTelefone,
        localExecucaoEndereco: payload.localExecucaoEndereco,
        serviceAddressLine1: payload.serviceAddressLine1,
        serviceAddressLine2: payload.serviceAddressLine2,
        serviceAddressCity: payload.serviceAddressCity,
        serviceAddressState: payload.serviceAddressState ?? 'TX',
        serviceAddressZip: payload.serviceAddressZip,
        propertyType: (payload.propertyType as PropertyType) ?? 'RESIDENTIAL',
        serviceCategory: (payload.serviceCategory as ServiceCategory) ?? 'REPAIR',
        contractType: (payload.contractType as ContractType) ?? 'LUMP_SUM',
        ...taxFields,
        tempoParaAceite: payload.tempoParaAceite,
        validadeProposta: payload.validadeProposta,
        prazoExecucaoEstimadoDias: payload.prazoExecucaoDias,
        janelaExecucaoPreferencial: payload.janelaExecucao,
        restricoesDeAcesso: payload.restricoesAcesso,
        permite: payload.permite,
        quaisPermites: payload.quaisPermites,
        normasReferencias: payload.normasReferencia,
        inspecoesNecessarias: payload.inspecoesNecessarias,
        condicoesPagamento: payload.condicoesPagamento,
        garantia: payload.garantia,
        exclusoes: payload.exclusoes,
        condicoesGerais: payload.condicoesGerais,
        internalEstimate: JSON.stringify(payload.estimativasInternas),
        gatilhoFaturamento: payload.gatilhoFaturamento as Proposta_gatilhoFaturamento | undefined,
        percentualSinal: payload.percentualSinal,
        formaPagamentoPreferida: normalizeFormaPagamento(payload.formaPreferida),
        instrucoesPagamento: payload.instrucoesFaturamento,
        observacoesParaCliente: payload.observacoesCliente,
        observacoesInternas: payload.observacoesInternas,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        // Relations
        PropostaMaterial: {
          create: payload.materiais.map(m => ({
            estoqueItemId: m.estoqueItemId,
            codigo: m.codigo,
            nome: m.nome,
            quantidade: m.quantidade,
            unidade: m.unidade,
            precoUnitario: m.valorUnitarioEstimado,
            status: m.status as PropostaMaterial_status | undefined,
            fornecedorPreferencial: m.fornecedor,
            observacao: m.observacoes,
            aComprar: m.aComprar,
            embalagemId: m.embalagemId,
            qtdEmbalagens: m.qtdEmbalagens,
            embalagemBaseQtyAtTime: m.embalagemBaseQtyAtTime,
            embalagemPrecoAtTime: m.embalagemPrecoAtTime,
            embalagemUnitAtTime: m.embalagemUnitAtTime,
          }))
        },
        PropostaEtapa: {
          create: payload.etapas.map(e => ({
            servico: e.servico,
            descricao: e.descricao,
            ordem: e.ordem,
            quantidade: e.quantidade,
            unidade: e.unidade,
            duracaoEstimadaHoras: e.duracaoEstimadaHoras,
            custoMaoObraEstimado: e.custoMaoObraEstimado,
            status: e.status as PropostaEtapa_status | undefined,
          }))
        }
      }) as unknown as Prisma.PropostaCreateInput,
      include: {
        Cliente: true,
        PropostaMaterial: true,
        PropostaEtapa: true
      }
    });

    return NextResponse.json({
      data: newProposta,
      message: 'Proposta criada com sucesso',
      success: true,
    }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === 'object' && error !== null &&
      'code' in error && (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Já existe uma proposta com este número', success: false },
        { status: 409 }
      );
    }
    throw error;
  }
});
