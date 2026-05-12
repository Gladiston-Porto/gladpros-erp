import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { generateNumeroProposta } from '@/shared/lib/services/proposta-numbering';
import type { AuditContext, ProposalOperationResult } from '../types';

export async function duplicateProposal(
  propostaId: number,
  audit: AuditContext
): Promise<ProposalOperationResult> {
  const original = await prisma.proposta.findFirst({
    where: { id: propostaId, deletedAt: null },
    include: { PropostaMaterial: true, PropostaEtapa: true },
  });

  if (!original) {
    return { success: false, error: 'Proposta não encontrada' };
  }

  const numeroProposta = await generateNumeroProposta();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newProposta = await prisma.$transaction(async (tx: any) => {
    const proposta = await tx.proposta.create({
      data: {
        numeroProposta,
        clienteId: original.clienteId,
        titulo: `${original.titulo} (Cópia)`,
        descricaoEscopo: original.descricaoEscopo,
        valorEstimado: original.valorEstimado,
        status: 'RASCUNHO',
        moeda: original.moeda,
        contatoNome: original.contatoNome,
        contatoEmail: original.contatoEmail,
        contatoTelefone: original.contatoTelefone,
        localExecucaoEndereco: original.localExecucaoEndereco,
        tempoParaAceite: original.tempoParaAceite,
        prazoExecucaoEstimadoDias: original.prazoExecucaoEstimadoDias,
        janelaExecucaoPreferencial: original.janelaExecucaoPreferencial,
        restricoesDeAcesso: original.restricoesDeAcesso,
        permite: original.permite,
        quaisPermites: original.quaisPermites,
        normasReferencias: original.normasReferencias,
        inspecoesNecessarias: original.inspecoesNecessarias,
        condicoesPagamento: original.condicoesPagamento,
        garantia: original.garantia,
        exclusoes: original.exclusoes,
        condicoesGerais: original.condicoesGerais,
        internalEstimate: original.internalEstimate,
        gatilhoFaturamento: original.gatilhoFaturamento,
        percentualSinal: original.percentualSinal,
        formaPagamentoPreferida: original.formaPagamentoPreferida,
        observacoesParaCliente: original.observacoesParaCliente,
        observacoesInternas: original.observacoesInternas,
        criadoPor: Number(audit.actorId),
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        PropostaMaterial: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: original.PropostaMaterial.map((m: any) => ({
            codigo: m.codigo,
            nome: m.nome,
            quantidade: m.quantidade,
            unidade: m.unidade,
            precoUnitario: m.precoUnitario,
            status: m.status,
            fornecedorPreferencial: m.fornecedorPreferencial,
            observacao: m.observacao,
            aComprar: m.aComprar,
            embalagemId: m.embalagemId,
            qtdEmbalagens: m.qtdEmbalagens,
            embalagemBaseQtyAtTime: m.embalagemBaseQtyAtTime,
            embalagemPrecoAtTime: m.embalagemPrecoAtTime,
            embalagemUnitAtTime: m.embalagemUnitAtTime,
          })),
        },
        PropostaEtapa: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: original.PropostaEtapa.map((e: any) => ({
            servico: e.servico,
            descricao: e.descricao,
            ordem: e.ordem,
            quantidade: e.quantidade,
            unidade: e.unidade,
            duracaoEstimadaHoras: e.duracaoEstimadaHoras,
            custoMaoObraEstimado: e.custoMaoObraEstimado,
            status: e.status,
          })),
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      include: { PropostaMaterial: true, PropostaEtapa: true, Cliente: true },
    });

    await tx.propostaLog.create({
      data: {
        id: randomUUID(),
        propostaId: proposta.id,
        actorId: Number(audit.actorId),
        action: 'CREATED',
        newJson: JSON.stringify({ duplicatedFrom: propostaId }),
        ip: audit.ip,
        userAgent: audit.userAgent,
      },
    });

    return proposta;
  });

  return { success: true, data: newProposta };
}
