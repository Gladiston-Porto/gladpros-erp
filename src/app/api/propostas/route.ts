
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adaptPropostaFormToAPI } from "@/components/propostas/adapter";
import { PropostaFormData } from "@/components/propostas/types";
import { withErrorHandler } from '@/lib/api/error-handler';
import { createPropostaSchema } from '@/schemas/proposta.schema';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import type { Prisma, Proposta_gatilhoFaturamento, Proposta_formaPagamentoPreferida, Proposta_status, PropostaMaterial_status, PropostaEtapa_status } from '@prisma/client';

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
      orderBy: { criadoEm: 'desc' },
      include: {
        Cliente: { select: { id: true, nomeCompleto: true, email: true } },
        _count: { select: { PropostaMaterial: true, PropostaEtapa: true, AnexoProposta: true } }
      }
    }),
    prisma.proposta.count({ where })
  ]);

  const mapped = items.map((p) => ({
    id: p.id,
    numeroProposta: p.numeroProposta,
    titulo: p.titulo,
    status: p.status,
    valorEstimado: p.valorEstimado ? Number(p.valorEstimado) : null,
    criadoEm: p.criadoEm,
    cliente: p.Cliente ? { id: p.Cliente.id, nome: p.Cliente.nomeCompleto, email: p.Cliente.email } : null,
    etapasCount: p._count?.PropostaEtapa ?? 0,
    materiaisCount: p._count?.PropostaMaterial ?? 0,
    anexosCount: p._count?.AnexoProposta ?? 0
  }));

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
    const body: PropostaFormData = createPropostaSchema.parse(await request.json());
    const payload = adaptPropostaFormToAPI(body);
    try {

    const newProposta = await prisma.proposta.create({
      data: ({
        numeroProposta: `PROP-${Date.now().toString().slice(-6)}`, // Auto-generate
        clienteId: payload.clienteId,
        titulo: payload.titulo || 'Sem título',
        descricaoEscopo: payload.descricao || '',
        valorEstimado: payload.valorEstimado,
        status: payload.status,
        contatoNome: payload.contatoNome,
        contatoEmail: payload.contatoEmail,
        contatoTelefone: payload.contatoTelefone,
        localExecucaoEndereco: payload.localExecucaoEndereco,
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
        formaPagamentoPreferida: payload.formaPreferida as Proposta_formaPagamentoPreferida | undefined,
        instrucoesPagamento: payload.instrucoesFaturamento,
        observacoesParaCliente: payload.observacoesCliente,
        observacoesInternas: payload.observacoesInternas,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        // Relations
        PropostaMaterial: {
          create: payload.materiais.map(m => ({
            codigo: m.codigo,
            nome: m.nome,
            quantidade: m.quantidade,
            unidade: m.unidade,
            precoUnitario: m.valorUnitarioEstimado,
            status: m.status as PropostaMaterial_status | undefined,
            fornecedorPreferencial: m.fornecedor,
            observacao: m.observacoes
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
