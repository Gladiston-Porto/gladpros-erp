/**
 * Prisma Inventory Gateway — Real implementation
 * Integra o domain de projetos com o módulo de estoque via Prisma
 */
import { prisma } from '@/lib/prisma';
import type {
  IInventoryGateway,
  LiberarMaterialDTO,
  DevolverMaterialDTO,
  RespostaIntegracaoEstoque,
  DisponibilidadeMaterial,
} from '../interfaces/inventory-gateway.interface';

export class PrismaInventoryGateway implements IInventoryGateway {
  async liberarMaterial(dados: LiberarMaterialDTO): Promise<RespostaIntegracaoEstoque> {
    const quantidade = Number(dados.quantidade);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return { sucesso: false, mensagem: 'Quantidade de liberação deve ser maior que zero' };
    }

    // Find the project material to get the actual materialId
    const projetoMaterial = await prisma.projetoMaterial.findUnique({
      where: { id: dados.materialId },
    });

    if (!projetoMaterial) {
      return { sucesso: false, mensagem: `Material de projeto ${dados.materialId} não encontrado` };
    }

    // Find the inventory material by code
    const material = await prisma.material.findFirst({
      where: { codigo: projetoMaterial.codigo ?? undefined },
    });

    if (!material) {
      // Material not tracked in inventory — allow release anyway
      return {
        sucesso: true,
        mensagem: `Material ${projetoMaterial.codigo} não rastreado no estoque — liberação registrada sem movimentação`,
        quantidadeProcessada: Number(dados.quantidade),
        processadoEm: new Date(),
      };
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const saldos = await tx.materialSaldo.findMany({
        where: { materialId: material.id },
        orderBy: [{ reservado: 'desc' }, { quantidade: 'desc' }],
        select: {
          id: true,
          loteId: true,
          localizacaoId: true,
          quantidade: true,
          reservado: true,
        },
      });

      const totalEmEstoque = saldos.reduce((sum, saldo) => sum + Number(saldo.quantidade), 0);
      if (totalEmEstoque < quantidade) {
        return {
          sucesso: false,
          mensagem: `Saldo insuficiente para liberar ${quantidade}. Disponível em estoque: ${totalEmEstoque}`,
        };
      }

      let restante = quantidade;
      const alocacoes: Array<{
        saldoId: number;
        loteId: number | null;
        localizacaoId: number;
        quantidade: number;
        consumirReserva: boolean;
      }> = [];

      for (const saldo of saldos) {
        if (restante <= 0) break;
        const reservado = Number(saldo.reservado);
        if (reservado <= 0) continue;
        const alocar = Math.min(restante, reservado, Number(saldo.quantidade));
        if (alocar <= 0) continue;
        alocacoes.push({
          saldoId: saldo.id,
          loteId: saldo.loteId,
          localizacaoId: saldo.localizacaoId,
          quantidade: alocar,
          consumirReserva: true,
        });
        restante -= alocar;
      }

      for (const saldo of saldos) {
        if (restante <= 0) break;
        const disponivelNaoReservado = Number(saldo.quantidade) - Number(saldo.reservado);
        if (disponivelNaoReservado <= 0) continue;
        const alocar = Math.min(restante, disponivelNaoReservado);
        alocacoes.push({
          saldoId: saldo.id,
          loteId: saldo.loteId,
          localizacaoId: saldo.localizacaoId,
          quantidade: alocar,
          consumirReserva: false,
        });
        restante -= alocar;
      }

      if (restante > 0.001) {
        return {
          sucesso: false,
          mensagem: `Saldo disponível insuficiente para liberar ${quantidade}`,
        };
      }

      const movimentacaoIds: number[] = [];
      for (const alocacao of alocacoes) {
        await tx.materialSaldo.update({
          where: { id: alocacao.saldoId },
          data: alocacao.consumirReserva
            ? {
                quantidade: { decrement: alocacao.quantidade },
                reservado: { decrement: alocacao.quantidade },
              }
            : {
                quantidade: { decrement: alocacao.quantidade },
              },
        });

        const movimentacao = await tx.materialMovimentacao.create({
          data: {
            tipo: 'SAIDA',
            materialId: material.id,
            loteId: alocacao.loteId,
            quantidade: alocacao.quantidade,
            localizacaoOrigemId: alocacao.localizacaoId,
            projetoId: dados.projetoId,
            motivo: dados.observacao ?? `Liberação para projeto ${dados.projetoId}`,
            criadoPor: dados.usuarioId,
          },
        });
        movimentacaoIds.push(Number(movimentacao.id));
      }

      return {
        sucesso: true,
        mensagem: 'Material liberado com sucesso',
        estoqueExternoId: movimentacaoIds.join(','),
        movimentacaoIds,
      };
    });

    if (!resultado.sucesso) {
      return resultado;
    }

    return {
      sucesso: true,
      estoqueExternoId: resultado.estoqueExternoId,
      mensagem: 'Material liberado com sucesso',
      detalhes: { movimentacaoIds: resultado.movimentacaoIds },
      quantidadeProcessada: quantidade,
      processadoEm: new Date(),
    };
  }

  async devolverMaterial(dados: DevolverMaterialDTO): Promise<RespostaIntegracaoEstoque> {
    const quantidade = Number(dados.quantidade);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return { sucesso: false, mensagem: 'Quantidade de devolução deve ser maior que zero' };
    }

    const projetoMaterial = await prisma.projetoMaterial.findUnique({
      where: { id: dados.materialId },
    });

    if (!projetoMaterial) {
      return { sucesso: false, mensagem: `Material de projeto ${dados.materialId} não encontrado` };
    }

    const material = await prisma.material.findFirst({
      where: { codigo: projetoMaterial.codigo ?? undefined },
    });

    if (!material) {
      return {
        sucesso: true,
        mensagem: `Material ${projetoMaterial.codigo} não rastreado no estoque — devolução registrada`,
        quantidadeProcessada: Number(dados.quantidade),
        processadoEm: new Date(),
      };
    }

    // Choose movement type based on condition
    const tipo = dados.condicao === 'PERDIDO' ? 'PERDA' : 'DEVOLUCAO';

    const resultado = await prisma.$transaction(async (tx) => {
      const saldo = await tx.materialSaldo.findFirst({
        where: { materialId: material.id },
        orderBy: { quantidade: 'desc' },
        select: {
          id: true,
          loteId: true,
          localizacaoId: true,
        },
      });

      if (tipo !== 'PERDA' && !saldo) {
        return {
          sucesso: false,
          mensagem: `Saldo de estoque não encontrado para devolver o material ${material.codigo}`,
        };
      }

      if (tipo !== 'PERDA' && saldo) {
        await tx.materialSaldo.update({
          where: { id: saldo.id },
          data: {
            quantidade: { increment: quantidade },
          },
        });
      }

      const movimentacao = await tx.materialMovimentacao.create({
        data: {
          tipo,
          materialId: material.id,
          loteId: saldo?.loteId ?? null,
          quantidade,
          localizacaoDestinoId: tipo !== 'PERDA' ? saldo?.localizacaoId : null,
          projetoId: dados.projetoId,
          motivo: dados.observacao ?? `Devolução do projeto ${dados.projetoId} — ${dados.condicao ?? 'BOM'}`,
          criadoPor: dados.usuarioId,
        },
      });

      return {
        sucesso: true,
        mensagem: `Material devolvido com sucesso`,
        estoqueExternoId: String(movimentacao.id),
      };
    });

    if (!resultado.sucesso) {
      return resultado;
    }

    return {
      sucesso: true,
      estoqueExternoId: resultado.estoqueExternoId,
      mensagem: `Material devolvido com sucesso (${dados.condicao ?? 'BOM'})`,
      quantidadeProcessada: quantidade,
      processadoEm: new Date(),
    };
  }

  async consultarDisponibilidade(codigoMaterial: string): Promise<DisponibilidadeMaterial | null> {
    const material = await prisma.material.findUnique({
      where: { codigo: codigoMaterial },
      include: {
        saldos: true,
        unidade: { select: { codigo: true } },
      },
    });

    if (!material) return null;

    const totalDisponivel = material.saldos.reduce(
      (sum: number, s: { disponivel?: unknown; quantidade: unknown }) => sum + Number(s.disponivel ?? s.quantidade),
      0
    );

    return {
      codigoMaterial: material.codigo,
      nomeMaterial: material.nome,
      quantidadeDisponivel: totalDisponivel,
      unidadeMedida: material.unidade?.codigo ?? 'UN',
      atualizadoEm: material.atualizadoEm ?? material.criadoEm,
    };
  }

  async verificarConexao(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
