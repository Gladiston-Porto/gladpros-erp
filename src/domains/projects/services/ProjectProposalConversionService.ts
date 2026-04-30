import { prisma } from '@/lib/prisma';
import { ProjectNumberService } from './ProjectNumberService';
import { validateProposalCompleteness } from '@/domains/proposals/services';

export class ProjectProposalConversionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectProposalConversionServiceError';
  }
}

export class ProjectProposalConversionService {
  private numberService = new ProjectNumberService();

  async convertFromProposal(propostaId: number, usuarioId: number) {
    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId, deletedAt: null },
      include: {
        Cliente: true,
        PropostaMaterial: true,
        PropostaEtapa: true,
      },
    });

    if (!proposta) {
      throw new ProjectProposalConversionServiceError('Proposta não encontrada');
    }

    if (proposta.status !== 'APROVADA') {
      throw new ProjectProposalConversionServiceError(
        `Apenas propostas com status APROVADA podem ser convertidas em projeto. Status atual: ${proposta.status}`
      );
    }

    if (proposta.projetoId) {
      throw new ProjectProposalConversionServiceError('Esta proposta já foi convertida em projeto');
    }

    const validation = validateProposalCompleteness(proposta);
    if (!validation.valid) {
      throw new ProjectProposalConversionServiceError(validation.errors.join('; '));
    }

    return prisma.$transaction(async (tx) => {
      // Re-check inside transaction to evitar race condition (TOCTOU)
      const propostaAtualizada = await tx.proposta.findUnique({
        where: { id: propostaId },
        select: { id: true, projetoId: true },
      });
      if (propostaAtualizada?.projetoId) {
        throw new ProjectProposalConversionServiceError('Esta proposta já foi convertida em projeto (race condition detectada)');
      }

      // Gerar número do projeto DENTRO da transação para evitar duplicação
      const numeroProjeto = await this.numberService.gerarNumeroProjeto();

      // Calcular data de conclusão prevista
      const dataInicioPrevista = new Date();
      const dataConclusaoPrevista = proposta.prazoExecucaoEstimadoDias
        ? new Date(dataInicioPrevista.getTime() + proposta.prazoExecucaoEstimadoDias * 24 * 60 * 60 * 1000)
        : undefined;

      const novoProjeto = await tx.projeto.create({
        data: {
          numeroProjeto,
          titulo: proposta.titulo,
          descricao: proposta.descricaoEscopo,
          clienteId: proposta.clienteId,
          propostaId: proposta.id,
          status: 'planejado',
          valorEstimado: proposta.valorEstimado,
          criadoPor: usuarioId,
          // Campos de endereço e contato copiados da proposta
          endereco: proposta.localExecucaoEndereco ?? undefined,
          endClientName: proposta.endClientName ?? undefined,
          endClientPhone: proposta.endClientPhone ?? undefined,
          endClientEmail: proposta.endClientEmail ?? undefined,
          endClientNotes: proposta.endClientNotes ?? undefined,
          // Datas previstas
          dataInicioPrevista,
          dataConclusaoPrevista: dataConclusaoPrevista ?? undefined,
          Etapas: {
            create: proposta.PropostaEtapa.map((etapa) => ({
              titulo: etapa.servico,
              servico: etapa.servico,
              descricao: etapa.descricao,
              ordem: etapa.ordem,
              status: 'pendente',
              inicioPrevisto: new Date(),
              fimPrevisto: new Date(new Date().setDate(new Date().getDate() + Number(etapa.duracaoEstimadaHoras || 0) / 8)),
            })),
          },
          Materiais: {
            create: proposta.PropostaMaterial.map((material) => ({
              nome: material.nome,
              codigo: material.codigo,
              unidade: material.unidade,
              quantidadePlanejada: material.quantidade,
              quantidadeLiberada: 0,
              quantidadeUtilizada: 0,
            })),
          },
        },
      });

      // Atualizar proposta com referência ao projeto e data de conversão
      await tx.proposta.update({
        where: { id: proposta.id },
        data: {
          projetoId: novoProjeto.id,
          dataConversao: new Date(),
          responsavelConversao: usuarioId,
          atualizadoPor: usuarioId,
        },
      });

      for (const material of proposta.PropostaMaterial) {
        let materialEstoque = null;
        if (material.estoqueItemId) {
          materialEstoque = await tx.material.findUnique({ where: { id: material.estoqueItemId } });
        } else if (material.codigo) {
          materialEstoque = await tx.material.findUnique({ where: { codigo: material.codigo } });
        }

        if (!materialEstoque) {
          continue;
        }

        await tx.projetoMaterialEstoque.create({
          data: {
            projetoId: novoProjeto.id,
            materialId: materialEstoque.id,
            quantidadeReservada: material.quantidade,
            quantidadeUsada: 0,
            cobrarCliente: true,
            dataReserva: new Date(),
            observacoes: `Reservado via conversão da proposta ${proposta.numeroProposta}`,
          },
        });
      }

      return novoProjeto;
    });
  }
}