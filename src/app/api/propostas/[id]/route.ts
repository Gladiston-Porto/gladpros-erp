
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adaptPropostaFormToAPI } from '@/components/propostas/adapter'
import { PropostaFormData } from '@/components/propostas/types'
import { withErrorHandler } from '@/lib/api/error-handler';
import { updatePropostaSchema } from '@/schemas/proposta.schema';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { calculateInvoiceTax } from '@/shared/services/salesTaxService';
import { getUnsupportedBillingTrigger, unsupportedBillingTriggerMessage } from '@/domains/proposals/services/billingTriggerPolicy';
import type { Proposta_gatilhoFaturamento, Proposta_formaPagamentoPreferida, PropostaMaterial_status, PropostaEtapa_status, PropertyType, ServiceCategory, ContractType, TaxMode } from '@prisma/client';

function normalizeFormaPagamento(value?: string): Proposta_formaPagamentoPreferida | undefined {
  if (!value) return undefined;
  const map: Record<string, Proposta_formaPagamentoPreferida> = {
    'invoice': 'INVOICE', 'check': 'CHECK', 'cheque': 'CHEQUE',
    'ach': 'ACH', 'ach transfer': 'ACH', 'wire': 'TRANSFERENCIA',
    'credit card': 'CREDIT_CARD', 'cartao': 'CARTAO', 'card': 'CREDIT_CARD',
    'pix': 'PIX', 'boleto': 'BOLETO', 'cash': 'DINHEIRO', 'dinheiro': 'DINHEIRO',
    'transferencia': 'TRANSFERENCIA', 'transfer': 'TRANSFERENCIA',
  };
  const validValues: Proposta_formaPagamentoPreferida[] = ['PIX','CARTAO','BOLETO','TRANSFERENCIA','DINHEIRO','CHEQUE','INVOICE','CHECK','ACH','CREDIT_CARD'];
  if (validValues.includes(value as Proposta_formaPagamentoPreferida)) return value as Proposta_formaPagamentoPreferida;
  return map[value.toLowerCase().trim()];
}

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

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'propostas', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params
    const propostaId = parseInt(id)

    if (isNaN(propostaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
      include: {
        PropostaMaterial: true,
        PropostaEtapa: true,
        Cliente: true
      }
    })

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data: proposta, success: true })
  });

export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const userPut = await requireUser(request);
  if (!can(userPut.role as Role, 'propostas', 'update')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }
    const { id } = await params
    const propostaId = parseInt(id)

    if (isNaN(propostaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = updatePropostaSchema.parse(await request.json()) as unknown as PropostaFormData
    // Convert form data to API/DB payload
    const payload = adaptPropostaFormToAPI(body)
    const unsupportedTrigger = getUnsupportedBillingTrigger(payload.gatilhoFaturamento);
    if (unsupportedTrigger) {
      return NextResponse.json(
        { error: 'Unsupported billing trigger', message: unsupportedBillingTriggerMessage(unsupportedTrigger), success: false },
        { status: 400 }
      );
    }

    const taxFields = computePropostaTax({
      valorEstimado: payload.valorEstimado,
      propertyType: payload.propertyType,
      serviceCategory: payload.serviceCategory,
      contractType: payload.contractType,
      serviceAddressState: payload.serviceAddressState,
    });

    const updatedProposta = await prisma.$transaction(async (tx) => {
      // 1. Update main fields
      await tx.proposta.update({
        where: { id: propostaId },
        data: {
          clienteId: payload.clienteId,
          titulo: payload.titulo,
          descricaoEscopo: payload.descricao,
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
          propertyType: (payload.propertyType as PropertyType) ?? undefined,
          serviceCategory: (payload.serviceCategory as ServiceCategory) ?? undefined,
          contractType: (payload.contractType as ContractType) ?? undefined,
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
          atualizadoEm: new Date(),
        }
      })

      // 2. Refresh materials (delete all and recreate)
      await tx.propostaMaterial.deleteMany({
        where: { propostaId: propostaId }
      })

      if (payload.materiais.length > 0) {
        await tx.propostaMaterial.createMany({
          data: payload.materiais.map(m => ({
            propostaId: propostaId,
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
        })
      }

      // 3. Refresh etapas
      await tx.propostaEtapa.deleteMany({
        where: { propostaId: propostaId }
      })

      if (payload.etapas.length > 0) {
        await tx.propostaEtapa.createMany({
          data: payload.etapas.map(e => ({
            propostaId: propostaId,
            servico: e.servico,
            descricao: e.descricao,
            ordem: e.ordem,
            quantidade: e.quantidade,
            unidade: e.unidade,
            duracaoEstimadaHoras: e.duracaoEstimadaHoras,
            custoMaoObraEstimado: e.custoMaoObraEstimado,
            status: e.status as PropostaEtapa_status | undefined,
          }))
        })
      }

      return await tx.proposta.findUnique({
        where: { id: propostaId },
        include: { PropostaMaterial: true, PropostaEtapa: true }
      })
    })

    return NextResponse.json({ data: updatedProposta, success: true })

  });

// DELETE /api/propostas/[id] - Soft delete proposta
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
    const userDel = await requireUser(request);
    if (!can(userDel.role as Role, 'propostas', 'delete')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }
    const { id } = await params;
    const propostaId = parseInt(id);

    if (isNaN(propostaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const proposta = await prisma.proposta.findFirst({
      where: { id: propostaId, deletedAt: null }
    });

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    if (!['RASCUNHO', 'CANCELADA'].includes(proposta.status)) {
      return NextResponse.json(
        { error: 'Apenas propostas em rascunho ou canceladas podem ser excluídas' },
        { status: 400 }
      );
    }

    await prisma.proposta.update({
      where: { id: propostaId },
      data: { deletedAt: new Date(), atualizadoEm: new Date() }
    });

    return NextResponse.json({ message: 'Proposta excluída com sucesso', success: true });
  });
