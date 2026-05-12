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
          // Restrições operacionais e janela de execução copiadas da proposta (para a equipe)
          restricoesOperacionais: [
            proposta.restricoesDeAcesso ? `Restrições de acesso: ${proposta.restricoesDeAcesso}` : null,
            proposta.janelaExecucaoPreferencial ? `Janela de execução: ${proposta.janelaExecucaoPreferencial}` : null,
          ].filter(Boolean).join('\n') || undefined,
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
              plannedUnitCost: material.precoUnitario ?? undefined,
              embalagemId: material.embalagemId ?? undefined,
              qtdEmbalagens: material.qtdEmbalagens ?? undefined,
              embalagemBaseQtyAtTime: material.embalagemBaseQtyAtTime ?? undefined,
              embalagemPrecoAtTime: material.embalagemPrecoAtTime ?? undefined,
              embalagemUnitAtTime: material.embalagemUnitAtTime ?? undefined,
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

      // Process each PropostaMaterial:
      // - If linked to estoque catalog → check stock availability:
      //   • Sufficient → RESERVADA (reserve MaterialSaldo)
      //   • Insufficient → PENDENTE_SC (reserve partial) + batch SC item
      // - If not linked to catalog → group into separate SC for non-catalog purchasing
      const nonCatalogMaterials: typeof proposta.PropostaMaterial = [];
      const catalogScItems: Array<{
        materialId: number;
        descricao: string;
        quantidadeSolicitada: number;
        custoEstimado: number | null;
        unidade: string | null;
      }> = [];

      for (const material of proposta.PropostaMaterial) {
        let materialEstoque = null;
        if (material.estoqueItemId) {
          materialEstoque = await tx.material.findUnique({ where: { id: material.estoqueItemId }, select: { id: true, codigo: true, nome: true, custoMedio: true, ultimoCusto: true } });
        } else if (material.codigo) {
          materialEstoque = await tx.material.findUnique({ where: { codigo: material.codigo }, select: { id: true, codigo: true, nome: true, custoMedio: true, ultimoCusto: true } });
        }

        if (!materialEstoque) {
          nonCatalogMaterials.push(material);
          continue;
        }

        const qtdNecessaria = Number(material.quantidade);

        // Check available stock for this material
        const saldos = await tx.materialSaldo.findMany({
          where: { materialId: materialEstoque.id },
          select: { id: true, quantidade: true, reservado: true },
        });
        const totalDisponivel = saldos.reduce(
          (acc, s) => acc + Number(s.quantidade) - Number(s.reservado),
          0
        );

        if (totalDisponivel >= qtdNecessaria - 0.001) {
          // ── Saldo suficiente → RESERVADA ──────────────────────────────────
          await tx.projetoMaterialEstoque.create({
            data: {
              projetoId: novoProjeto.id,
              materialId: materialEstoque.id,
              quantidadeReservada: qtdNecessaria,
              custoUnitario: materialEstoque.custoMedio ?? materialEstoque.ultimoCusto ?? null,
              cobrarCliente: true,
              status: 'RESERVADA',
              dataReserva: new Date(),
              observacoes: `Reservado via conversão da proposta ${proposta.numeroProposta}`,
              embalagemId: material.embalagemId ?? undefined,
              qtdEmbalagens: material.qtdEmbalagens ?? undefined,
              embalagemBaseQtyAtTime: material.embalagemBaseQtyAtTime ?? undefined,
              embalagemPrecoAtTime: material.embalagemPrecoAtTime ?? undefined,
              embalagemUnitAtTime: material.embalagemUnitAtTime ?? undefined,
            },
          });

          // Reserve stock from available saldo buckets
          let qtdAReservar = qtdNecessaria;
          for (const saldo of saldos) {
            if (qtdAReservar <= 0.001) break;
            const disponivel = Number(saldo.quantidade) - Number(saldo.reservado);
            if (disponivel <= 0.001) continue;
            const reservarAqui = Math.min(qtdAReservar, disponivel);
            await tx.materialSaldo.update({
              where: { id: saldo.id },
              data: { reservado: { increment: reservarAqui } },
            });
            qtdAReservar -= reservarAqui;
          }
        } else {
          // ── Saldo insuficiente → PENDENTE_SC + batches para SC ─────────────
          const qtdSuficiente = Math.max(0, totalDisponivel);
          const qtdParaComprar = qtdNecessaria - qtdSuficiente;

          await tx.projetoMaterialEstoque.create({
            data: {
              projetoId: novoProjeto.id,
              materialId: materialEstoque.id,
              quantidadeReservada: qtdSuficiente, // o que tem agora
              custoUnitario: materialEstoque.custoMedio ?? materialEstoque.ultimoCusto ?? null,
              cobrarCliente: true,
              status: 'PENDENTE_SC',
              dataReserva: qtdSuficiente > 0 ? new Date() : null,
              observacoes: `Saldo insuficiente na conversão da proposta ${proposta.numeroProposta}. Necessário: ${qtdNecessaria}, disponível: ${qtdSuficiente}`,
              embalagemId: material.embalagemId ?? undefined,
              qtdEmbalagens: material.qtdEmbalagens ?? undefined,
              embalagemBaseQtyAtTime: material.embalagemBaseQtyAtTime ?? undefined,
              embalagemPrecoAtTime: material.embalagemPrecoAtTime ?? undefined,
              embalagemUnitAtTime: material.embalagemUnitAtTime ?? undefined,
            },
          });

          // Reserve whatever is available now
          if (qtdSuficiente > 0) {
            let qtdAReservar = qtdSuficiente;
            for (const saldo of saldos) {
              if (qtdAReservar <= 0.001) break;
              const disponivel = Number(saldo.quantidade) - Number(saldo.reservado);
              if (disponivel <= 0.001) continue;
              const reservarAqui = Math.min(qtdAReservar, disponivel);
              await tx.materialSaldo.update({
                where: { id: saldo.id },
                data: { reservado: { increment: reservarAqui } },
              });
              qtdAReservar -= reservarAqui;
            }
          }

          // Queue for grouped SC
          catalogScItems.push({
            materialId: materialEstoque.id,
            descricao: `${materialEstoque.codigo} — ${materialEstoque.nome}`,
            quantidadeSolicitada: qtdParaComprar,
            custoEstimado: material.precoUnitario != null ? Number(material.precoUnitario) : null,
            unidade: material.unidade ?? null,
          });
        }
      }

      // ── SC #1: catalog materials with insufficient stock ──────────────────
      if (catalogScItems.length > 0) {
        const valorEstimadoCatalog = catalogScItems.reduce((sum, item) => {
          return sum + (item.custoEstimado ?? 0) * item.quantidadeSolicitada;
        }, 0);
        await tx.solicitacaoCompra.create({
          data: {
            empresaId: 1,
            origemTipo: 'PROJETO',
            origemId: novoProjeto.id,
            status: 'RASCUNHO',
            solicitanteId: usuarioId,
            valorEstimado: valorEstimadoCatalog,
            observacoes: `SC gerada automaticamente: materiais do catálogo com estoque insuficiente na conversão da proposta ${proposta.numeroProposta}`,
            itens: {
              create: catalogScItems.map((item) => ({
                materialId: item.materialId,
                descricao: item.descricao,
                unidade: item.unidade,
                quantidadeSolicitada: item.quantidadeSolicitada,
                custoEstimado: item.custoEstimado,
              })),
            },
          },
        });
      }

      // ── SC #2: non-catalog materials (no estoque link) ────────────────────
      if (nonCatalogMaterials.length > 0) {
        const valorEstimado = nonCatalogMaterials.reduce((sum, m) => {
          const unit = Number(m.precoUnitario ?? 0);
          const qty = Number(m.quantidade ?? 0);
          return sum + unit * qty;
        }, 0);

        await tx.solicitacaoCompra.create({
          data: {
            empresaId: 1,
            origemTipo: 'PROJETO',
            origemId: novoProjeto.id,
            status: 'RASCUNHO',
            solicitanteId: usuarioId,
            valorEstimado,
            observacoes: `Materiais sem estoque vinculados convertidos da proposta ${proposta.numeroProposta}`,
            itens: {
              create: nonCatalogMaterials.map((m) => ({
                materialId: null,
                descricao: m.nome || 'Material sem cadastro',
                unidade: m.unidade || null,
                quantidadeSolicitada: m.quantidade,
                custoEstimado: m.precoUnitario != null
                  ? Number(m.precoUnitario) * Number(m.quantidade)
                  : null,
              })),
            },
          },
        });
      }

      return novoProjeto;
    });
  }
}