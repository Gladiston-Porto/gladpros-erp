/**
 * ProjectStageService  
 * Serviço para gerenciamento de etapas de projetos
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  ProjetoEtapa_status,
  TRANSICOES_STATUS_ETAPA,
  ACAO_HISTORICO,
} from "../entities";
import {
  CreateProjetoEtapaDTO,
  UpdateProjetoEtapaDTO,
  AlterarStatusEtapaDTO,
  ProjetoEtapaResponseDTO,
} from "../dtos";
import { ProjectHistoryService } from "./ProjectHistoryService";

export class ProjectStageServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ProjectStageServiceError";
  }
}

export class ProjectStageService {
  private prisma = prisma;
  private historyService = new ProjectHistoryService();

  /**
   * Cria uma nova etapa
   */
  async criar(data: CreateProjetoEtapaDTO, usuarioId: number): Promise<ProjetoEtapaResponseDTO> {
    // Valida se projeto existe
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: data.projetoId },
    });

    if (!projeto) {
      throw new ProjectStageServiceError(
        "Projeto não encontrado",
        "PROJETO_NAO_ENCONTRADO",
        404
      );
    }

    // Determina a ordem da etapa (se não fornecida)
    let ordem = data.ordem;
    if (!ordem) {
      const ultimaEtapa = await this.prisma.projetoEtapa.findFirst({
        where: { projetoId: data.projetoId },
        orderBy: { ordem: 'desc' },
      });
      ordem = (ultimaEtapa?.ordem || 0) + 1;
    }

    // Cria a etapa
    const etapa = await this.prisma.projetoEtapa.create({
      data: {
        projetoId: data.projetoId,
        ordem,
        servico: data.servico,
        descricao: data.descricao,
        inicioPrevisto: data.inicioPrevisto ? new Date(data.inicioPrevisto as string) : null,
        fimPrevisto: data.fimPrevisto ? new Date(data.fimPrevisto as string) : null,
        status: 'pendente',
        porcentagem: 0,
      },
      select: {
        id: true,
        projetoId: true,
        ordem: true,
        servico: true,
        descricao: true,
        inicioPrevisto: true,
        fimPrevisto: true,
        status: true,
        porcentagem: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
      },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: data.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.ETAPA_CRIADA,
      detalhes: `Etapa "${data.servico}" criada`,
    });

    return this.mapearParaResponse(etapa);
  }

  /**
   * Busca etapa por ID
   */
  async buscarPorId(id: number): Promise<ProjetoEtapaResponseDTO | null> {
    const etapa = await this.prisma.projetoEtapa.findUnique({
      where: { id },
      select: {
        id: true,
        projetoId: true,
        ordem: true,
        servico: true,
        descricao: true,
        inicioPrevisto: true,
        fimPrevisto: true,
        status: true,
        porcentagem: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
        Tarefas: true,
      },
    });

    if (!etapa) {
      return null;
    }

    return this.mapearParaResponse(etapa);
  }

  /**
   * Lista etapas de um projeto
   */
  async listarPorProjeto(projetoId: number): Promise<ProjetoEtapaResponseDTO[]> {
    const etapas = await this.prisma.projetoEtapa.findMany({
      where: { projetoId },
      orderBy: { ordem: 'asc' },
      select: {
        id: true,
        projetoId: true,
        ordem: true,
        servico: true,
        descricao: true,
        inicioPrevisto: true,
        fimPrevisto: true,
        status: true,
        porcentagem: true,
        checklistItens: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
        _count: {
          select: {
            Tarefas: true,
          },
        },
      },
    });

    return etapas.map((e) => this.mapearParaResponse(e));
  }

  /**
   * Atualiza uma etapa
   */
  async atualizar(
    id: number,
    data: UpdateProjetoEtapaDTO,
    usuarioId: number
  ): Promise<ProjetoEtapaResponseDTO> {
    const etapaExistente = await this.prisma.projetoEtapa.findUnique({
      where: { id },
      include: { Projeto: true },
    });

    if (!etapaExistente) {
      throw new ProjectStageServiceError(
        "Etapa não encontrada",
        "ETAPA_NAO_ENCONTRADA",
        404
      );
    }

    const etapa = await this.prisma.projetoEtapa.update({
      where: { id },
      data: {
        servico: data.servico,
        descricao: data.descricao,
        ordem: data.ordem,
        inicioPrevisto: data.inicioPrevisto ? new Date(data.inicioPrevisto as string) : undefined,
        fimPrevisto: data.fimPrevisto ? new Date(data.fimPrevisto as string) : undefined,
        fimReal: data.fimReal ? new Date(data.fimReal as string) : undefined,
        porcentagem: data.porcentagem,
      },
      select: {
        id: true,
        projetoId: true,
        ordem: true,
        servico: true,
        descricao: true,
        inicioPrevisto: true,
        fimPrevisto: true,
        status: true,
        porcentagem: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
      },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: etapaExistente.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.ETAPA_ATUALIZADA,
      detalhes: `Etapa "${etapa.servico}" atualizada`,
    });

    return this.mapearParaResponse(etapa);
  }

  /**
   * Altera o status de uma etapa
   */
  async alterarStatus(
    id: number,
    data: AlterarStatusEtapaDTO,
    usuarioId: number
  ): Promise<ProjetoEtapaResponseDTO> {
    const etapa = await this.prisma.projetoEtapa.findUnique({
      where: { id },
    });

    if (!etapa) {
      throw new ProjectStageServiceError(
        "Etapa não encontrada",
        "ETAPA_NAO_ENCONTRADA",
        404
      );
    }

    // Valida transição de status
    if (!this.validarTransicaoStatus(etapa.status, data.novoStatus)) {
      throw new ProjectStageServiceError(
        `Transição de status inválida: ${etapa.status} → ${data.novoStatus}`,
        "TRANSICAO_INVALIDA",
        400
      );
    }

    // Se concluída, define 100% e data de conclusão
    const updateData: Prisma.ProjetoEtapaUpdateInput = {
      status: data.novoStatus,
    };

    if (data.novoStatus === 'concluida') {
      updateData.porcentagem = 100;
      updateData.fimReal = new Date();
    }

    const etapaAtualizada = await this.prisma.projetoEtapa.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        projetoId: true,
        ordem: true,
        servico: true,
        descricao: true,
        inicioPrevisto: true,
        fimPrevisto: true,
        status: true,
        porcentagem: true,
        criadoEm: true,
        atualizadoEm: true,
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
      },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: etapa.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.ETAPA_ATUALIZADA,
      detalhes: data.observacao || `Etapa "${etapa.servico}": ${etapa.status} → ${data.novoStatus}`,
    });

    return this.mapearParaResponse(etapaAtualizada);
  }

  /**
   * Exclui uma etapa
   */
  async excluir(id: number, usuarioId: number): Promise<void> {
    const etapa = await this.prisma.projetoEtapa.findUnique({
      where: { id },
    });

    if (!etapa) {
      throw new ProjectStageServiceError(
        "Etapa não encontrada",
        "ETAPA_NAO_ENCONTRADA",
        404
      );
    }

    // Não permite exclusão de etapas concluídas
    if (etapa.status === 'concluida') {
      throw new ProjectStageServiceError(
        "Não é possível excluir etapas concluídas",
        "EXCLUSAO_NAO_PERMITIDA",
        400
      );
    }

    await this.prisma.projetoEtapa.delete({
      where: { id },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: etapa.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.ETAPA_ATUALIZADA,
      detalhes: `Etapa "${etapa.servico}" excluída`,
    });
  }

  /**
   * Reordena etapas de um projeto
   */
  async reordenar(projetoId: number, etapasOrdem: { id: number; ordem: number }[], usuarioId: number): Promise<void> {
    // Valida se todas as etapas pertencem ao projeto
    const etapas = await this.prisma.projetoEtapa.findMany({
      where: {
        id: { in: etapasOrdem.map(e => e.id) },
        projetoId,
      },
    });

    if (etapas.length !== etapasOrdem.length) {
      throw new ProjectStageServiceError(
        "Uma ou mais etapas não pertencem ao projeto",
        "ETAPAS_INVALIDAS",
        400
      );
    }

    // Atualiza a ordem de cada etapa
    await this.prisma.$transaction(
      etapasOrdem.map(({ id, ordem }) =>
        this.prisma.projetoEtapa.update({
          where: { id },
          data: { ordem },
        })
      )
    );

    // Registra no histórico
    await this.historyService.registrar({
      projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.ETAPA_ATUALIZADA,
      detalhes: `Ordem das etapas alterada`,
    });
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Valida se uma transição de status é permitida
   */
  private validarTransicaoStatus(statusAtual: ProjetoEtapa_status, novoStatus: ProjetoEtapa_status): boolean {
    const transicoesPermitidas = TRANSICOES_STATUS_ETAPA[statusAtual];
    return transicoesPermitidas ? transicoesPermitidas.includes(novoStatus) : false;
  }

  /**
   * Mapeia entidade Prisma para DTO de resposta
   */
  private mapearParaResponse(etapa: {
    id: number;
    projetoId: number;
    ordem: number;
    servico: string;
    descricao: string | null;
    status: string;
    inicioPrevisto: Date | null;
    fimPrevisto: Date | null;
    fimReal?: Date | null | undefined;
    porcentagem: Prisma.Decimal | number;
    checklistItens?: unknown;
    criadoEm: Date;
    atualizadoEm: Date | null;
    Projeto?: { numeroProjeto: string; titulo: string } | null;
    _count?: { Tarefas: number };
  }): ProjetoEtapaResponseDTO {
    return {
      id: etapa.id,
      projetoId: etapa.projetoId,
      projetoNumeroProjeto: etapa.Projeto?.numeroProjeto,
      projetoTitulo: etapa.Projeto?.titulo,
      ordem: etapa.ordem,
      servico: etapa.servico,
      descricao: etapa.descricao,
      status: etapa.status as ProjetoEtapa_status,
      inicioPrevisto: etapa.inicioPrevisto,
      fimPrevisto: etapa.fimPrevisto,
      fimReal: etapa.fimReal ?? null,
      porcentagem: Number(etapa.porcentagem),
      checklistItens: Array.isArray(etapa.checklistItens) ? etapa.checklistItens as Array<{ id: string; texto: string; concluido: boolean }> : null,
      criadoEm: etapa.criadoEm,
      atualizadoEm: etapa.atualizadoEm ?? etapa.criadoEm,
      totalTarefas: etapa._count?.Tarefas,
      tarefasConcluidas: undefined, // Requer query adicional
    };
  }
}
