/**
 * Serviço de Movimentações de Estoque
 * Fase 5: Ponte Estoque
 * 
 * Gerencia liberações e devoluções de materiais entre projetos e estoque.
 * Integra com sistema de estoque através do IInventoryGateway.
 */

import prisma from '../../../shared/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  LiberarMaterialDTO,
  DevolverMaterialDTO,
  MovimentacaoEstoque,
  ListarMovimentacoesDTO,
  ListarMovimentacoesResponse,
  IInventoryGateway,
} from '../interfaces/inventory-gateway.interface';
import { getInventoryGateway } from '../gateways/mock-inventory.gateway';

// Tipo do retorno do Prisma com includes
type MovimentacaoComRelacoes = Awaited<ReturnType<typeof prisma.projetoMovimentacaoEstoque.findMany>>[0];

/**
 * Serviço para gerenciar movimentações de estoque de projetos
 */
export class InventoryMovementService {
  private gateway: IInventoryGateway;

  constructor(gateway?: IInventoryGateway) {
    this.gateway = gateway || getInventoryGateway();
  }

  /**
   * Libera material do estoque para uso no projeto
   * 
   * Fluxo:
   * 1. Valida se o material existe e pertence ao projeto
   * 2. Cria registro de movimentação com status PENDENTE
   * 3. Chama gateway de estoque para processar liberação
   * 4. Atualiza quantidade liberada do material
   * 5. Atualiza status da movimentação
   * 6. Registra no histórico do projeto
   * 
   * @throws Error se material não encontrado ou quantidade inválida
   */
  async liberarMaterial(dados: LiberarMaterialDTO): Promise<MovimentacaoEstoque> {
    // 1. Validar material
    const material = await prisma.projetoMaterial.findFirst({
      where: {
        id: dados.materialId,
        projetoId: dados.projetoId,
      },
    });

    if (!material) {
      throw new Error('Material não encontrado no projeto');
    }

    if (dados.quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    const statusAtual = String(material.status ?? '').toUpperCase();
    const allowedStatuses = ['DISPONIVEL', 'RESERVADO', 'LIBERADO', 'EM_ANDAMENTO'];
    if (statusAtual && !allowedStatuses.includes(statusAtual)) {
      throw new Error('Material não está disponível');
    }

    const quantidadePlanejada = Number(
      material.quantidadePlanejada ?? 0
    );
    const quantidadeLiberada = Number(
      material.quantidadeLiberada ?? 0
    );

    if (quantidadeLiberada + dados.quantidade > quantidadePlanejada) {
      throw new Error(
        `Quantidade excede o planejado. Planejado: ${quantidadePlanejada}, Já liberado: ${quantidadeLiberada}, Solicitado: ${dados.quantidade}`
      );
    }

    // 2. Criar registro de movimentação (PENDENTE)
    const movimentacao = await prisma.projetoMovimentacaoEstoque.create({
      data: {
        projetoId: dados.projetoId,
        materialId: dados.materialId,
        tipoMovimentacao: 'LIBERACAO',
        quantidade: dados.quantidade,
        quantidadeAnterior: quantidadeLiberada,
        observacao: dados.observacao,
        usuarioId: dados.usuarioId,
        statusIntegracao: 'PENDENTE',
      },
    });

    try {
      // 3. Chamar gateway de estoque
      await prisma.projetoMovimentacaoEstoque.update({
        where: { id: movimentacao.id },
        data: { statusIntegracao: 'PROCESSANDO' },
      });

      const resultado = await this.gateway.liberarMaterial(dados);

      if (!resultado.sucesso) {
        throw new Error(resultado.mensagem);
      }

      // 4. Atualizar quantidade liberada do material
      await prisma.projetoMaterial.update({
        where: { id: dados.materialId },
        data: {
          quantidadeLiberada: {
            increment: dados.quantidade,
          },
          status: 'liberado',
        },
      });

      // 5. Atualizar movimentação para CONCLUIDA
      const movimentacaoAtualizada = await prisma.projetoMovimentacaoEstoque.update({
        where: { id: movimentacao.id },
        data: {
          statusIntegracao: 'CONCLUIDA',
          estoqueExternoId: resultado.estoqueExternoId,
          metadadosIntegracao: (resultado.detalhes as Prisma.JsonObject) || Prisma.JsonNull,
          processadoEm: new Date(),
        },
      });

      // 6. Registrar no histórico
      await prisma.projetoHistorico.create({
        data: {
          projetoId: dados.projetoId,
          usuarioId: dados.usuarioId,
          acao: 'MATERIAL_LIBERADO',
          detalhes: {
            materialId: dados.materialId,
            materialNome: material.nome,
            quantidade: dados.quantidade,
            movimentacaoId: movimentacao.id,
          },
        },
      });

      return this.mapToMovimentacaoEstoque(movimentacaoAtualizada);
    } catch (error) {
      // Em caso de erro, atualizar movimentação com status ERRO
      const movimentacaoErro = await prisma.projetoMovimentacaoEstoque.update({
        where: { id: movimentacao.id },
        data: {
          statusIntegracao: 'ERRO',
          erroIntegracao: (error as Error).message,
          processadoEm: new Date(),
        },
      });

      return this.mapToMovimentacaoEstoque(movimentacaoErro);
    }
  }

  /**
   * Devolve material do projeto para o estoque
   * 
   * Fluxo:
   * 1. Valida se o material existe e tem quantidade liberada
   * 2. Cria registro de movimentação com status PENDENTE
   * 3. Chama gateway de estoque para processar devolução
   * 4. Atualiza quantidade devolvida do material
   * 5. Atualiza status da movimentação
   * 6. Registra no histórico do projeto
   */
  async devolverMaterial(dados: DevolverMaterialDTO): Promise<MovimentacaoEstoque> {
    // 1. Validar material
    const material = await prisma.projetoMaterial.findFirst({
      where: {
        id: dados.materialId,
        projetoId: dados.projetoId,
      },
    });

    if (!material) {
      throw new Error('Material não encontrado no projeto');
    }

    if (dados.quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    const quantidadeLiberada = Number(
      material.quantidadeLiberada ?? 0
    );
    const quantidadeDevolvida = Number(material.quantidadeDevolvida ?? 0);
    const quantidadeDisponivel = quantidadeLiberada - quantidadeDevolvida;

    if (dados.quantidade > quantidadeDisponivel) {
      throw new Error(
        `Quantidade excede a disponível. Liberado: ${quantidadeLiberada}, Já devolvido: ${quantidadeDevolvida}, Disponível: ${quantidadeDisponivel}`
      );
    }

    // 2. Criar registro de movimentação (PENDENTE)
    const movimentacao = await prisma.projetoMovimentacaoEstoque.create({
      data: {
        projetoId: dados.projetoId,
        materialId: dados.materialId,
        tipoMovimentacao: 'DEVOLUCAO',
        quantidade: dados.quantidade,
        quantidadeAnterior: quantidadeDevolvida,
        observacao: dados.observacao,
        usuarioId: dados.usuarioId,
        statusIntegracao: 'PENDENTE',
      },
    });

    try {
      // 3. Chamar gateway de estoque
      await prisma.projetoMovimentacaoEstoque.update({
        where: { id: movimentacao.id },
        data: { statusIntegracao: 'PROCESSANDO' },
      });

      const resultado = await this.gateway.devolverMaterial(dados);

      if (!resultado.sucesso) {
        throw new Error(resultado.mensagem);
      }

      // 4. Atualizar quantidade devolvida do material
      await prisma.projetoMaterial.update({
        where: { id: dados.materialId },
        data: {
          quantidadeDevolvida: {
            increment: dados.quantidade,
          },
          status: 'devolucao_pendente',
        },
      });

      // 5. Atualizar movimentação para CONCLUIDA
      const movimentacaoAtualizada = await prisma.projetoMovimentacaoEstoque.update({
        where: { id: movimentacao.id },
        data: {
          statusIntegracao: 'CONCLUIDA',
          estoqueExternoId: resultado.estoqueExternoId,
          metadadosIntegracao: (resultado.detalhes as Prisma.JsonObject) || Prisma.JsonNull,
          processadoEm: new Date(),
        },
      });

      // 6. Registrar no histórico
      await prisma.projetoHistorico.create({
        data: {
          projetoId: dados.projetoId,
          usuarioId: dados.usuarioId,
          acao: 'MATERIAL_DEVOLVIDO',
          detalhes: {
            materialId: dados.materialId,
            materialNome: material.nome,
            quantidade: dados.quantidade,
            movimentacaoId: movimentacao.id,
          },
        },
      });

      return this.mapToMovimentacaoEstoque(movimentacaoAtualizada);
    } catch (error) {
      // Em caso de erro, atualizar movimentação com status ERRO
      const movimentacaoErro = await prisma.projetoMovimentacaoEstoque.update({
        where: { id: movimentacao.id },
        data: {
          statusIntegracao: 'ERRO',
          erroIntegracao: (error as Error).message,
          processadoEm: new Date(),
        },
      });

      return this.mapToMovimentacaoEstoque(movimentacaoErro);
    }
  }

  /**
   * Lista movimentações de estoque com filtros e paginação
   */
  async listar(filtros: ListarMovimentacoesDTO): Promise<ListarMovimentacoesResponse> {
    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 20;
    const offset = (pagina - 1) * limite;

    const where: Prisma.ProjetoMovimentacaoEstoqueWhereInput = {
      projetoId: filtros.projetoId,
    };

    if (filtros.materialId) {
      where.materialId = filtros.materialId;
    }

    if (filtros.tipoMovimentacao) {
      where.tipoMovimentacao = filtros.tipoMovimentacao;
    }

    if (filtros.statusIntegracao) {
      where.statusIntegracao = filtros.statusIntegracao;
    }

    if (filtros.dataInicio || filtros.dataFim) {
      where.criadoEm = {};
      if (filtros.dataInicio) {
        where.criadoEm.gte = filtros.dataInicio;
      }
      if (filtros.dataFim) {
        where.criadoEm.lte = filtros.dataFim;
      }
    }

    const [movimentacoes, total] = await Promise.all([
      prisma.projetoMovimentacaoEstoque.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: offset,
        take: limite,
        include: {
          Material: {
            select: {
              nome: true,
              codigo: true,
              unidade: true,
            },
          },
          Usuario: {
            select: {
              nomeCompleto: true,
              email: true,
            },
          },
        },
      }),
      prisma.projetoMovimentacaoEstoque.count({ where }),
    ]);

    return {
      data: movimentacoes.map((m: MovimentacaoComRelacoes) => this.mapToMovimentacaoEstoque(m)),
      paginacao: {
        paginaAtual: pagina,
        totalPaginas: Math.ceil(total / limite),
        totalItens: total,
        itensPorPagina: limite,
      },
    };
  }

  /**
   * Busca uma movimentação específica por ID
   */
  async buscarPorId(id: number, projetoId: number): Promise<MovimentacaoEstoque | null> {
    const movimentacao = await prisma.projetoMovimentacaoEstoque.findFirst({
      where: {
        id,
        projetoId,
      },
      include: {
        Material: {
          select: {
            nome: true,
            codigo: true,
            unidade: true,
          },
        },
        Usuario: {
          select: {
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    return movimentacao ? this.mapToMovimentacaoEstoque(movimentacao) : null;
  }

  /**
   * Mapeia modelo do Prisma para interface de domínio
   */
  private mapToMovimentacaoEstoque(data: MovimentacaoComRelacoes): MovimentacaoEstoque {
    const metadados = data.metadadosIntegracao;
    const metadadosIntegracao =
      metadados && typeof metadados === 'object' && !Array.isArray(metadados)
        ? (metadados as Record<string, any>)
        : undefined;

    return {
      id: data.id,
      projetoId: data.projetoId,
      materialId: data.materialId,
      tipoMovimentacao: data.tipoMovimentacao,
      quantidade: Number(data.quantidade),
      quantidadeAnterior: Number(data.quantidadeAnterior),
      observacao: data.observacao ?? undefined,
      usuarioId: data.usuarioId,
      estoqueExternoId: data.estoqueExternoId ?? undefined,
      statusIntegracao: data.statusIntegracao,
      erroIntegracao: data.erroIntegracao ?? undefined,
      metadadosIntegracao,
      criadoEm: data.criadoEm,
      processadoEm: data.processadoEm ?? undefined,
    };
  }
}
