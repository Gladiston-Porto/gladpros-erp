import { withErrorHandler } from '@/lib/api/error-handler';
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { updatePropostaSchema } from "@/schemas/proposta.schema";
import { adaptPropostaFormToAPI } from "@/components/propostas/adapter";
import type { PropostaFormData } from "@/components/propostas/types";
import type { PropostaMaterial_status, PropostaEtapa_status, PropertyType, ServiceCategory, ContractType, TaxMode, Proposta_gatilhoFaturamento, Proposta_formaPagamentoPreferida } from "@prisma/client";
import { calculateInvoiceTax } from "@/shared/services/salesTaxService";

function normalizeFormaPagamento(value?: string): Proposta_formaPagamentoPreferida | undefined {
  if (!value) return undefined;
  const validValues: Proposta_formaPagamentoPreferida[] = ['PIX','CARTAO','BOLETO','TRANSFERENCIA','DINHEIRO','CHEQUE','INVOICE','CHECK','ACH','CREDIT_CARD'];
  if (validValues.includes(value as Proposta_formaPagamentoPreferida)) return value as Proposta_formaPagamentoPreferida;
  return undefined;
}

const rascunhoSchema = z.object({
  id: z.number().int().positive().optional(),
}).passthrough()

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'propostas', 'create')) {
    return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const body = rascunhoSchema.safeParse(raw).success
    ? rascunhoSchema.parse(raw)
    : {}
  const propostaId = body?.id ? Number(body.id) : null;

  // Attempt full save if schema is valid and proposta is a RASCUNHO
  if (propostaId && !isNaN(propostaId)) {
    const existing = await prisma.proposta.findFirst({
      where: { id: propostaId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (existing && existing.status === 'RASCUNHO') {
      const fullParsed = updatePropostaSchema.safeParse(raw);

      if (fullParsed.success) {
        // Full save: update all fields + refresh materials + etapas
        const payload = adaptPropostaFormToAPI(fullParsed.data as unknown as PropostaFormData);

        const taxResult = calculateInvoiceTax({
          subtotal: payload.valorEstimado || 0,
          classification: {
            propertyType: (payload.propertyType as PropertyType) ?? null,
            serviceCategory: (payload.serviceCategory as ServiceCategory) ?? null,
            contractType: (payload.contractType as ContractType) ?? null,
            serviceAddressState: payload.serviceAddressState ?? 'TX',
          },
        });

        await prisma.$transaction(async (tx) => {
          await tx.proposta.update({
            where: { id: propostaId },
            data: {
              clienteId: payload.clienteId,
              titulo: payload.titulo,
              descricaoEscopo: payload.descricao,
              valorEstimado: payload.valorEstimado,
              // status intentionally kept as RASCUNHO — do not promote via auto-save
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
              taxScenario: taxResult.scenario,
              taxMode: taxResult.taxMode as TaxMode,
              taxRate: taxResult.taxRate,
              taxAmount: taxResult.taxAmount,
              taxExplanation: taxResult.taxExplanation,
              taxRequiresReview: taxResult.requiresManualReview,
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
            },
          });

          // Refresh materials
          await tx.propostaMaterial.deleteMany({ where: { propostaId } });
          if (payload.materiais.length > 0) {
            await tx.propostaMaterial.createMany({
              data: payload.materiais.map(m => ({
                propostaId,
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
              })),
            });
          }

          // Refresh etapas
          await tx.propostaEtapa.deleteMany({ where: { propostaId } });
          if (payload.etapas.length > 0) {
            await tx.propostaEtapa.createMany({
              data: payload.etapas.map(e => ({
                propostaId,
                servico: e.servico,
                descricao: e.descricao,
                ordem: e.ordem,
                quantidade: e.quantidade,
                unidade: e.unidade,
                duracaoEstimadaHoras: e.duracaoEstimadaHoras,
                custoMaoObraEstimado: e.custoMaoObraEstimado,
                status: e.status as PropostaEtapa_status | undefined,
              })),
            });
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Rascunho completo salvo',
          timestamp: new Date().toISOString(),
        });
      }

      // Schema validation failed — fallback to timestamp-only update (partial form)
      await prisma.proposta.update({
        where: { id: propostaId },
        data: { atualizadoEm: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Rascunho recebido (parcial)',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Nova proposta em construção — sem ID ainda, confirmar recebimento sem persistir
  return NextResponse.json({
    success: true,
    message: 'Rascunho recebido',
    timestamp: new Date().toISOString(),
  });
});
