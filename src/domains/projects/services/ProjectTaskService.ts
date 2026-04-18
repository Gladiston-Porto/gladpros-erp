/**
 * ProjectTaskService
 * Serviço para gerenciamento de tarefas de projetos
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  ProjetoTarefa_status,
  TRANSICOES_STATUS_TAREFA,
  ACAO_HISTORICO,
} from "../entities";
import {
  CreateProjetoTarefaDTO,
  UpdateProjetoTarefaDTO,
  AlterarStatusTarefaDTO,
  ProjetoTarefaResponseDTO,
} from "../dtos";
import { ProjectHistoryService } from "./ProjectHistoryService";

export class ProjectTaskServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ProjectTaskServiceError";
  }
}

export class ProjectTaskService {
  private prisma = prisma;
  private historyService = new ProjectHistoryService();

  /**
   * Cria uma nova tarefa
   */
  async criar(data: CreateProjetoTarefaDTO, usuarioId: number): Promise<ProjetoTarefaResponseDTO> {
    // Valida se projeto existe
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: data.projetoId },
    });

    if (!projeto) {
      throw new ProjectTaskServiceError(
        "Projeto não encontrado",
        "PROJETO_NAO_ENCONTRADO",
        404
      );
    }

    // Valida etapa (se fornecida)
    if (data.etapaId) {
      const etapa = await this.prisma.projetoEtapa.findUnique({
        where: { id: data.etapaId },
      });

      if (!etapa || etapa.projetoId !== data.projetoId) {
        throw new ProjectTaskServiceError(
          "Etapa não encontrada ou não pertence ao projeto",
          "ETAPA_INVALIDA",
          400
        );
      }
    }

    // Valida responsável (se fornecido)
    if (data.atribuidaPara) {
      const responsavel = await this.prisma.usuario.findUnique({
        where: { id: data.atribuidaPara },
      });

      if (!responsavel) {
        throw new ProjectTaskServiceError(
          "Responsável não encontrado",
          "RESPONSAVEL_NAO_ENCONTRADO",
          404
        );
      }
    }

    const tarefa = await this.prisma.projetoTarefa.create({
      data: {
        projetoId: data.projetoId,
        etapaId: data.etapaId,
        titulo: data.titulo,
        descricao: data.descricao,
        prioridade: data.prioridade || 'media',
        atribuidaPara: data.atribuidaPara,
        prazo: data.prazo ? new Date(data.prazo as string) : null,
        status: 'aberta',
        criadoPor: usuarioId,
      },
      include: {
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
        Etapa: {
          select: {
            id: true,
            servico: true,
          },
        },
        AtribuidaPara: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: data.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.TAREFA_CRIADA,
      detalhes: `Tarefa "${data.titulo}" criada`,
    });

    return this.mapearParaResponse(tarefa);
  }

  /**
   * Busca tarefa por ID
   */
  async buscarPorId(id: number): Promise<ProjetoTarefaResponseDTO | null> {
    const tarefa = await this.prisma.projetoTarefa.findUnique({
      where: { id },
      select: {
        id: true,
        projetoId: true,
        etapaId: true,
        titulo: true,
        descricao: true,
        status: true,
        prioridade: true,
        atribuidaPara: true,
        prazo: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
        Etapa: {
          select: {
            id: true,
            servico: true,
          },
        },
        AtribuidaPara: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    if (!tarefa) {
      return null;
    }

    return this.mapearParaResponse(tarefa);
  }

  /**
   * Lista tarefas de um projeto
   */
  async listarPorProjeto(projetoId: number, etapaId?: number): Promise<ProjetoTarefaResponseDTO[]> {
    const where: Prisma.ProjetoTarefaWhereInput = { projetoId };
    if (etapaId) {
      where.etapaId = etapaId;
    }

    const tarefas = await this.prisma.projetoTarefa.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        projetoId: true,
        etapaId: true,
        titulo: true,
        descricao: true,
        status: true,
        prioridade: true,
        atribuidaPara: true,
        prazo: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
        Etapa: {
          select: {
            id: true,
            servico: true,
          },
        },
        AtribuidaPara: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    return tarefas.map((t) => this.mapearParaResponse(t));
  }

  /**
   * Atualiza uma tarefa
   */
  async atualizar(
    id: number,
    data: UpdateProjetoTarefaDTO,
    usuarioId: number
  ): Promise<ProjetoTarefaResponseDTO> {
    const tarefaExistente = await this.prisma.projetoTarefa.findUnique({
      where: { id },
    });

    if (!tarefaExistente) {
      throw new ProjectTaskServiceError(
        "Tarefa não encontrada",
        "TAREFA_NAO_ENCONTRADA",
        404
      );
    }

    // Valida etapa (se alterada)
    if (data.etapaId !== undefined && data.etapaId !== null) {
      const etapa = await this.prisma.projetoEtapa.findUnique({
        where: { id: data.etapaId },
      });

      if (!etapa || etapa.projetoId !== tarefaExistente.projetoId) {
        throw new ProjectTaskServiceError(
          "Etapa não encontrada ou não pertence ao projeto",
          "ETAPA_INVALIDA",
          400
        );
      }
    }

    // Valida responsável (se alterado)
    if (data.atribuidaPara !== undefined && data.atribuidaPara !== null) {
      const responsavel = await this.prisma.usuario.findUnique({
        where: { id: data.atribuidaPara },
      });

      if (!responsavel) {
        throw new ProjectTaskServiceError(
          "Responsável não encontrado",
          "RESPONSAVEL_NAO_ENCONTRADO",
          404
        );
      }
    }

    const tarefa = await this.prisma.projetoTarefa.update({
      where: { id },
      data: {
        etapaId: data.etapaId,
        titulo: data.titulo,
        descricao: data.descricao,
        prioridade: data.prioridade,
        atribuidaPara: data.atribuidaPara,
        prazo: data.prazo ? new Date(data.prazo as string) : undefined,
      },
      select: {
        id: true,
        projetoId: true,
        etapaId: true,
        titulo: true,
        descricao: true,
        status: true,
        prioridade: true,
        atribuidaPara: true,
        prazo: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
        Etapa: {
          select: {
            id: true,
            servico: true,
          },
        },
        AtribuidaPara: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    await this.historyService.registrar({
      projetoId: tarefaExistente.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.TAREFA_CRIADA,
      detalhes: `Tarefa "${tarefa.titulo}" atualizada`,
    });

    return this.mapearParaResponse(tarefa);
  }

  /**
   * Altera o status de uma tarefa
   */
  async alterarStatus(
    id: number,
    data: AlterarStatusTarefaDTO,
    usuarioId: number
  ): Promise<ProjetoTarefaResponseDTO> {
    const tarefa = await this.prisma.projetoTarefa.findUnique({
      where: { id },
    });

    if (!tarefa) {
      throw new ProjectTaskServiceError(
        "Tarefa não encontrada",
        "TAREFA_NAO_ENCONTRADA",
        404
      );
    }

    // Valida transição de status
    if (!this.validarTransicaoStatus(tarefa.status, data.novoStatus)) {
      throw new ProjectTaskServiceError(
        `Transição de status inválida: ${tarefa.status} → ${data.novoStatus}`,
        "TRANSICAO_INVALIDA",
        400
      );
    }

    // Se concluída, registra data de conclusão
    const updateData: Prisma.ProjetoTarefaUpdateInput = {
      status: data.novoStatus,
    };

    const tarefaAtualizada = await this.prisma.projetoTarefa.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        projetoId: true,
        etapaId: true,
        titulo: true,
        descricao: true,
        status: true,
        prioridade: true,
        atribuidaPara: true,
        prazo: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
        Etapa: {
          select: {
            id: true,
            servico: true,
          },
        },
        AtribuidaPara: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });

    const acao = data.novoStatus === 'concluida'
      ? ACAO_HISTORICO.TAREFA_CONCLUIDA
      : ACAO_HISTORICO.TAREFA_CRIADA;

    await this.historyService.registrar({
      projetoId: tarefa.projetoId,
      usuarioId,
      acao,
      detalhes: data.observacao || `Tarefa "${tarefa.titulo}": ${tarefa.status} → ${data.novoStatus}`,
    });

    return this.mapearParaResponse(tarefaAtualizada);
  }

  /**
   * Exclui uma tarefa
   */
  async excluir(id: number, usuarioId: number): Promise<void> {
    const tarefa = await this.prisma.projetoTarefa.findUnique({
      where: { id },
    });

    if (!tarefa) {
      throw new ProjectTaskServiceError(
        "Tarefa não encontrada",
        "TAREFA_NAO_ENCONTRADA",
        404
      );
    }

    // Não permite exclusão de tarefas concluídas
    if (tarefa.status === 'concluida') {
      throw new ProjectTaskServiceError(
        "Não é possível excluir tarefas concluídas",
        "EXCLUSAO_NAO_PERMITIDA",
        400
      );
    }

    await this.prisma.projetoTarefa.delete({
      where: { id },
    });

    await this.historyService.registrar({
      projetoId: tarefa.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.TAREFA_CRIADA,
      detalhes: `Tarefa "${tarefa.titulo}" excluída`,
    });
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private validarTransicaoStatus(statusAtual: ProjetoTarefa_status, novoStatus: ProjetoTarefa_status): boolean {
    const transicoesPermitidas = TRANSICOES_STATUS_TAREFA[statusAtual];
    return transicoesPermitidas ? transicoesPermitidas.includes(novoStatus) : false;
  }

  private mapearParaResponse(tarefa: unknown): ProjetoTarefaResponseDTO {
    const t = tarefa as Prisma.ProjetoTarefaGetPayload<{
      include: {
        Projeto: { select: { numeroProjeto: true; titulo: true } };
        Etapa: { select: { servico: true } };
        AtribuidaPara: { select: { nomeCompleto: true } };
      };
    }>;

    return {
      id: t.id,
      projetoId: t.projetoId,
      projetoNumeroProjeto: t.Projeto?.numeroProjeto,
      projetoTitulo: t.Projeto?.titulo,
      etapaId: t.etapaId,
      etapaServico: t.Etapa?.servico,
      titulo: t.titulo,
      descricao: t.descricao,
      status: t.status,
      prioridade: t.prioridade,
      atribuidaPara: t.atribuidaPara,
      responsavelNome: t.AtribuidaPara?.nomeCompleto ?? undefined,
      prazo: t.prazo,
      criadoEm: t.criadoEm,
      atualizadoEm: t.atualizadoEm ?? t.criadoEm,
    };
  }
}
