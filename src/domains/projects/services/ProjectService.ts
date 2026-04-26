/**
 * ProjectService
 * Serviço principal para gerenciamento de projetos
 * Contém toda a lógica de negócio relacionada a projetos
 *
 * Teste B2: mudança apenas em src/ para validar findRelatedTests
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { eventBus } from "@/server/events/event-bus";
import {
  Projeto,
  Projeto_status,
  PROJETO_STATUS,
  TRANSICOES_STATUS_PROJETO,
  ACAO_HISTORICO,
} from "../entities";
import {
  CreateProjetoDTO,
  UpdateProjetoDTO,
  AlterarStatusProjetoDTO,
  ProjetoResponseDTO,
  ListarProjetosDTO,
  PaginatedResponse,
  DashboardProjetosDTO,
} from "../dtos";
import { ProjectNumberService } from "./ProjectNumberService";
import { ProjectHistoryService } from "./ProjectHistoryService";
import { ProjectMaterialMetricsService } from "./ProjectMaterialMetricsService";
import { ITriageGateway } from "../interfaces/triage-gateway.interface";
import { getTriageGateway } from "../gateways";
import { NotificationService } from "@/shared/lib/notifications";

export class ProjectServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "ProjectServiceError";
  }
}

export class ProjectService {
  private prisma = prisma;
  private numberService = new ProjectNumberService();
  private historyService = new ProjectHistoryService();
  private materialMetricsService = new ProjectMaterialMetricsService();
  private triageGateway: ITriageGateway;

  constructor(triageGateway?: ITriageGateway) {
    this.triageGateway = triageGateway || getTriageGateway();
  }

  /**
   * Cria um novo projeto
   */
  async criar(data: CreateProjetoDTO, usuarioId: number): Promise<ProjetoResponseDTO> {
    // Gera número do projeto automaticamente
    const numeroProjeto = await this.numberService.gerarNumeroProjeto();

    // Valida cliente
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: data.clienteId },
    });

    if (!cliente) {
      throw new ProjectServiceError(
        "Cliente não encontrado",
        "CLIENTE_NAO_ENCONTRADO",
        404
      );
    }

    // Valida responsável (se fornecido)
    if (data.responsavelId) {
      const responsavel = await this.prisma.usuario.findUnique({
        where: { id: data.responsavelId },
      });

      if (!responsavel) {
        throw new ProjectServiceError(
          "Responsável não encontrado",
          "RESPONSAVEL_NAO_ENCONTRADO",
          404
        );
      }
    }

    // Valida proposta (se fornecida)
    if (data.propostaId) {
      const proposta = await this.prisma.proposta.findUnique({
        where: { id: data.propostaId },
      });

      if (!proposta) {
        throw new ProjectServiceError(
          "Proposta não encontrada",
          "PROPOSTA_NAO_ENCONTRADA",
          404
        );
      }
    }

    // Cria o projeto
    const projeto = await this.prisma.projeto.create({
      data: {
        numeroProjeto,
        titulo: data.titulo,
        descricao: data.descricao,
        clienteId: data.clienteId,
        propostaId: data.propostaId,
        responsavelId: data.responsavelId,
        dataInicioPrevista: data.dataInicio ? new Date(data.dataInicio) : null,
        dataConclusaoPrevista: data.dataPrevisao ? new Date(data.dataPrevisao) : null,
        valorEstimado: data.valorOrcado,
        status: PROJETO_STATUS.PLANEJADO,
        prioridade: data.prioridade || "media",
        criadoPor: usuarioId,
      },
      include: {
        Cliente: true,
        Proposta: true,
        Responsavel: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        CriadoPor: {
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
      projetoId: projeto.id,
      usuarioId,
      acao: ACAO_HISTORICO.CRIACAO,
      detalhes: { mensagem: `Projeto ${numeroProjeto} criado` },
    });

    return this.mapearParaResponse(projeto);
  }

  /**
   * Busca projeto por ID
   */
  async buscarPorId(id: number, includeRelations = false): Promise<ProjetoResponseDTO | null> {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: includeRelations
        ? {
            Cliente: true,
            Proposta: true,
            Responsavel: {
              select: { id: true, nomeCompleto: true, email: true },
            },
            CriadoPor: {
              select: { id: true, nomeCompleto: true, email: true },
            },
            Etapas: true,
            Materiais: true,
            Tarefas: true,
            Anexos: true,
          }
        : {
            Cliente: true,
            Proposta: true,
            Responsavel: {
              select: { id: true, nomeCompleto: true, email: true },
            },
            CriadoPor: {
              select: { id: true, nomeCompleto: true, email: true },
            },
          },
    });

    if (!projeto) {
      return null;
    }

    return this.mapearParaResponse(projeto);
  }

  /**
   * Busca projeto por número
   */
  async buscarPorNumero(numeroProjeto: string): Promise<ProjetoResponseDTO | null> {
    const projeto = await this.prisma.projeto.findUnique({
      where: { numeroProjeto },
      include: {
        Cliente: true,
        Proposta: true,
        Responsavel: {
          select: { id: true, nomeCompleto: true, email: true },
        },
        CriadoPor: {
          select: { id: true, nomeCompleto: true, email: true },
        },
      },
    });

    if (!projeto) {
      return null;
    }

    return this.mapearParaResponse(projeto);
  }

  /**
   * Lista projetos com filtros e paginação
   */
  async listar(filtros: ListarProjetosDTO): Promise<PaginatedResponse<ProjetoResponseDTO>> {
    const {
      pagina = 1,
      limite = 20,
      status,
      prioridade,
      clienteId,
      responsavelId,
      busca,
      ordenarPor = 'criadoEm',
      ordenarDirecao = 'desc',
    } = filtros;
    const skip = (pagina - 1) * limite;

    // Constrói where clause
    const where: any = {};

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (prioridade) {
      where.prioridade = Array.isArray(prioridade) ? { in: prioridade } : prioridade;
    }

    if (clienteId) {
      where.clienteId = clienteId;
    }

    if (responsavelId) {
      where.responsavelId = responsavelId;
    }

    if (busca) {
      where.OR = [
        { numeroProjeto: { contains: busca } },
        { titulo: { contains: busca } },
        { descricao: { contains: busca } },
      ];
    }

    // Busca projetos e conta total
    const [projetos, total] = await Promise.all([
      this.prisma.projeto.findMany({
        where,
        skip,
        take: limite,
        orderBy: { [ordenarPor]: ordenarDirecao },
        include: {
          Cliente: true,
          Proposta: true,
          Responsavel: {
            select: { id: true, nomeCompleto: true, email: true },
          },
          CriadoPor: {
            select: { id: true, nomeCompleto: true, email: true },
          },
          _count: {
            select: {
              Etapas: true,
              Tarefas: true,
              Materiais: true,
              Anexos: true,
            },
          },
        },
      }),
      this.prisma.projeto.count({ where }),
    ]);

    const totalPaginas = Math.ceil(total / limite);

    return {
      data: projetos.map((p: any) => this.mapearParaResponse(p)),
      paginacao: {
        paginaAtual: pagina,
        porPagina: limite,
        totalItens: total,
        totalPaginas,
        temProxima: pagina < totalPaginas,
        temAnterior: pagina > 1,
      },
    };
  }

  /**
   * Atualiza um projeto
   */
  async atualizar(
    id: number,
    data: UpdateProjetoDTO,
    usuarioId: number
  ): Promise<ProjetoResponseDTO> {
    // Verifica se projeto existe
    const projetoExistente = await this.prisma.projeto.findUnique({
      where: { id },
    });

    if (!projetoExistente) {
      throw new ProjectServiceError(
        "Projeto não encontrado",
        "PROJETO_NAO_ENCONTRADO",
        404
      );
    }

    if (projetoExistente.baselineLockedAt) {
      const tentativaAlterarBaseline =
        data.budgetBaseline !== undefined ||
        data.baselineLockedAt !== undefined ||
        data.baselineLockedBy !== undefined;

      if (tentativaAlterarBaseline) {
        throw new ProjectServiceError(
          "Baseline está bloqueada para este projeto",
          "BASELINE_LOCKED",
          409
        );
      }
    }

    // Valida responsável (se alterado)
    if (data.responsavelId !== undefined) {
      if (data.responsavelId !== null) {
        const responsavel = await this.prisma.usuario.findUnique({
          where: { id: data.responsavelId },
        });

        if (!responsavel) {
          throw new ProjectServiceError(
            "Responsável não encontrado",
            "RESPONSAVEL_NAO_ENCONTRADO",
            404
          );
        }
      }
    }

    // Atualiza o projeto
    const projeto = await this.prisma.projeto.update({
      where: { id },
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        budgetBaseline:
          data.budgetBaseline === undefined
            ? undefined
            : (data.budgetBaseline as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput),
        baselineLockedAt: data.baselineLockedAt ? new Date(data.baselineLockedAt) : undefined,
        baselineLockedBy: data.baselineLockedBy,
        responsavelId: data.responsavelId,
        dataInicioPrevista: data.dataInicio ? new Date(data.dataInicio) : undefined,
        dataConclusaoPrevista: data.dataPrevisao ? new Date(data.dataPrevisao) : undefined,
        dataConclusaoReal: data.dataConclusao ? new Date(data.dataConclusao) : undefined,
        valorEstimado: data.valorOrcado,
        custoReal: data.valorRealizado,
        prioridade: data.prioridade,
      },
      include: {
        Cliente: true,
        Proposta: true,
        Responsavel: {
          select: { id: true, nomeCompleto: true, email: true },
        },
        CriadoPor: {
          select: { id: true, nomeCompleto: true, email: true },
        },
      },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: projeto.id,
      usuarioId,
      acao: ACAO_HISTORICO.ATUALIZACAO,
      detalhes: { mensagem: `Projeto ${projeto.numeroProjeto} atualizado` },
    });

    // Disparar alertas de orçamento se custoReal foi atualizado (non-blocking)
    if (data.valorRealizado !== undefined) {
      this.checkAndFireBudgetAlerts(projeto.id, projeto.numeroProjeto).catch((err) =>
        console.error('[ProjectService] BudgetAlert error:', err)
      );
    }

    return this.mapearParaResponse(projeto);
  }

  /**
   * Altera o status de um projeto
   */
  async alterarStatus(
    id: number,
    data: AlterarStatusProjetoDTO,
    usuarioId: number
  ): Promise<ProjetoResponseDTO> {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: {
        Proposta: {
          select: {
            permite: true,
          },
        },
        projectPermits: {
          select: {
            id: true,
            jurisdiction: true,
            permitType: true,
            permitNumber: true,
            status: true,
          },
        },
        projectInspections: {
          select: {
            id: true,
            permitId: true,
            inspectionType: true,
            status: true,
            scheduledFor: true,
          },
        },
        projectPunchItems: {
          select: {
            id: true,
            status: true,
            priority: true,
            description: true,
            dueDate: true,
            assignedToWorkerId: true,
          },
        },
      },
    });

    if (!projeto) {
      throw new ProjectServiceError(
        "Projeto não encontrado",
        "PROJETO_NAO_ENCONTRADO",
        404
      );
    }

    // Valida transição de status
    const statusAtual = projeto.status;
    const novoStatus = data.novoStatus;

    if (!this.validarTransicaoStatus(statusAtual, novoStatus)) {
      throw new ProjectServiceError(
        `Transição de status inválida: ${statusAtual} → ${novoStatus}`,
        "TRANSICAO_INVALIDA",
        409,
        {
          statusAtual,
          statusSolicitado: novoStatus,
        }
      );
    }

    await this.assertPermitRequirementsForFinalStatus(projeto, novoStatus);
    await this.assertInspectionRequirementsForFinalStatus(projeto, novoStatus);
    await this.assertPunchListRequirementsForFinalStatus(projeto, novoStatus);
    await this.assertMaterialRequirementsForFinalStatus(projeto, novoStatus);

    // FASE 6: Bloqueio por triagens pendentes
    if (novoStatus === PROJETO_STATUS.CONCLUIDO) {
      const temTriagensPendentes = await this.triageGateway.verificarBloqueio(id);
      if (temTriagensPendentes) {
        throw new ProjectServiceError(
          "Não é possível concluir o projeto com triagens pendentes ou em andamento",
          "TRIAGENS_PENDENTES",
          409
        );
      }
    }

    // FASE 6: Gatilhos automáticos de triagem
    await this.dispararGatilhosTriagem(id, statusAtual, novoStatus, usuarioId);

    // Atualiza dados específicos por status
    const updateData: any = {
      status: novoStatus,
    };

    // Se concluído, registra data de conclusão
    if (novoStatus === PROJETO_STATUS.CONCLUIDO) {
      updateData.dataConclusao = new Date();
    }

    // Atualiza o projeto
    const projetoAtualizado = await this.prisma.projeto.update({
      where: { id },
      data: updateData,
      include: {
        Cliente: true,
        Proposta: true,
        Responsavel: {
          select: { id: true, nomeCompleto: true, email: true },
        },
        CriadoPor: {
          select: { id: true, nomeCompleto: true, email: true },
        },
      },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: projetoAtualizado.id,
      usuarioId,
      acao: ACAO_HISTORICO.STATUS_ALTERADO,
      detalhes: {
        mensagem: data.observacao || `Status alterado: ${statusAtual} → ${novoStatus}`,
        statusAnterior: statusAtual,
        statusNovo: novoStatus,
      },
    });

    // Emit domain events
    await eventBus.emit({
      name: 'project.statusChanged',
      aggregateType: 'project',
      aggregateId: String(id),
      payload: { projetoId: id, oldStatus: statusAtual, newStatus: novoStatus, changedBy: usuarioId },
    }).catch((err) => console.error('[ProjectService] Failed to emit project.statusChanged:', err));

    if (novoStatus === PROJETO_STATUS.CONCLUIDO) {
      await eventBus.emit({
        name: 'project.completed',
        aggregateType: 'project',
        aggregateId: String(id),
        payload: { projetoId: id, completedBy: usuarioId },
      }).catch((err) => console.error('[ProjectService] Failed to emit project.completed:', err));
    }

    return this.mapearParaResponse(projetoAtualizado);
  }

  /**
   * Exclui um projeto (soft delete)
   */
  async excluir(id: number, usuarioId: number, motivo: string): Promise<void> {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
    });

    if (!projeto) {
      throw new ProjectServiceError(
        "Projeto não encontrado",
        "PROJETO_NAO_ENCONTRADO",
        404
      );
    }

    // Não permite exclusão de projetos em execução ou concluídos
    if (projeto.status === PROJETO_STATUS.EM_EXECUCAO || projeto.status === PROJETO_STATUS.CONCLUIDO) {
      throw new ProjectServiceError(
        "Não é possível excluir projetos em execução ou concluídos",
        "EXCLUSAO_NAO_PERMITIDA",
        400
      );
    }

    // Registra no histórico ANTES de excluir
    await this.historyService.registrar({
      projetoId: projeto.id,
      usuarioId,
      acao: ACAO_HISTORICO.CRIACAO, // Usando CRIACAO por falta de EXCLUSAO
      detalhes: { mensagem: `Projeto ${projeto.numeroProjeto} excluído. Motivo: ${motivo}` },
    });
  }

  /**
   * Obtém dados do dashboard de projetos
   */
  async obterDashboard(): Promise<DashboardProjetosDTO> {
    const [totalProjetos, projetosPorStatus, projetosPorPrioridade] = await Promise.all([
      this.prisma.projeto.count(),
      this.prisma.projeto.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.projeto.groupBy({
        by: ['prioridade'],
        _count: true,
      }),
    ]);

    // Monta objetos de contagem
    const porStatus: Record<Projeto_status, number> = {
      planejado: 0,
      em_execucao: 0,
      em_inspecao: 0,
      aguardando_devolucoes: 0,
      concluido: 0,
      arquivado: 0,
      suspenso: 0,
      cancelado: 0,
    };

    projetosPorStatus.forEach((item: any) => {
      porStatus[item.status as Projeto_status] = item._count;
    });

    const porPrioridade: Record<string, number> = {
      baixa: 0,
      media: 0,
      alta: 0,
      critica: 0,
    };

    projetosPorPrioridade.forEach((item: any) => {
      porPrioridade[item.prioridade] = item._count;
    });

    // Projetos atrasados (dataConclusaoPrevista < hoje e status != concluido/cancelado)
    const hoje = new Date();
    const projetosAtrasados = await this.prisma.projeto.count({
      where: {
        dataConclusaoPrevista: {
          lt: hoje,
        },
        status: {
          notIn: [PROJETO_STATUS.CONCLUIDO, PROJETO_STATUS.CANCELADO, PROJETO_STATUS.ARQUIVADO],
        },
      },
    });

    // Tarefas pendentes
    const tarefasPendentes = await this.prisma.projetoTarefa.count({
      where: {
        status: {
          in: ['aberta', 'em_andamento'],
        },
      },
    });

    // Materiais pendentes (em uso ou devolução pendente)
    const materiaisPendentes = await this.prisma.projetoMaterial.count({
      where: {
        status: {
          in: ['em_uso', 'devolucao_pendente'],
        },
      },
    });

    // Projetos próximos do vencimento (7 dias)
    const proximoVencimento = new Date();
    proximoVencimento.setDate(proximoVencimento.getDate() + 7);

    const projetosProximosVencimento = await this.prisma.projeto.findMany({
      where: {
        dataConclusaoPrevista: {
          gte: hoje,
          lte: proximoVencimento,
        },
        status: {
          notIn: [PROJETO_STATUS.CONCLUIDO, PROJETO_STATUS.CANCELADO, PROJETO_STATUS.ARQUIVADO],
        },
      },
      take: 10,
      orderBy: {
        dataConclusaoPrevista: 'asc',
      },
      include: {
        Cliente: true,
        Responsavel: {
          select: { id: true, nomeCompleto: true, email: true },
        },
        CriadoPor: {
          select: { id: true, nomeCompleto: true, email: true },
        },
      },
    });

    return {
      totalProjetos,
      porStatus,
      porPrioridade: porPrioridade as any,
      projetosAtrasados,
      tarefasPendentes,
      materiaisPendentes,
      projetosProximosVencimento: projetosProximosVencimento.map((p: any) =>
        this.mapearParaResponse(p)
      ),
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Dispara gatilhos automáticos de triagem baseado em mudanças de status
   * FASE 6: Gatilhos de Triagem
   */
  private async dispararGatilhosTriagem(
    projetoId: number,
    statusAnterior: Projeto_status,
    statusNovo: Projeto_status,
    usuarioId: number
  ): Promise<void> {
    const regras = this.obterRegrasTriagem(statusAnterior, statusNovo);

    for (const regra of regras) {
      try {
        await this.triageGateway.abrirTriagem({
          projetoId,
          tipo: regra.tipo,
          prioridade: regra.prioridade,
          motivo: regra.motivo,
          usuarioId,
          prazoEstimadoDias: regra.prazoEstimadoDias,
        });

        // Registra no histórico
        await this.historyService.registrar({
          projetoId,
          usuarioId,
          acao: 'OBSERVACAO' as any,
          detalhes: {
            mensagem: `Triagem automática aberta: ${regra.motivo}`,
            camposAlterados: {
              tipo: regra.tipo,
              prioridade: regra.prioridade,
              statusAnterior,
              statusNovo,
            },
          },
        });
      } catch (error) {
        // Log mas não falha a transição de status
        console.error(`Erro ao abrir triagem automática: ${error}`);
      }
    }
  }

  /**
   * Define regras de triagem baseado em transições de status
   * FASE 6: Regras de Negócio
   */
  private obterRegrasTriagem(
    statusAnterior: Projeto_status,
    statusNovo: Projeto_status
  ): Array<{
    tipo: 'MATERIAL' | 'EQUIPAMENTO' | 'FERRAMENTA' | 'INSPECAO';
    prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
    motivo: string;
    prazoEstimadoDias?: number;
  }> {
    const regras: any[] = [];

    // Regra 1: Ao iniciar execução, triagem de materiais
    if (statusNovo === PROJETO_STATUS.EM_EXECUCAO && statusAnterior === PROJETO_STATUS.PLANEJADO) {
      regras.push({
        tipo: 'MATERIAL',
        prioridade: 'ALTA',
        motivo: 'Triagem inicial de materiais ao iniciar projeto',
        prazoEstimadoDias: 3,
      });
      regras.push({
        tipo: 'EQUIPAMENTO',
        prioridade: 'MEDIA',
        motivo: 'Verificação de equipamentos necessários',
        prazoEstimadoDias: 5,
      });
    }

    // Regra 2: Ao suspender projeto, inspeção de estado
    if (statusNovo === PROJETO_STATUS.SUSPENSO) {
      regras.push({
        tipo: 'INSPECAO',
        prioridade: 'ALTA',
        motivo: 'Inspeção de estado do projeto antes de suspender',
        prazoEstimadoDias: 1,
      });
    }

    // Regra 3: Ao reativar projeto suspenso, verificação completa
    if (statusNovo === PROJETO_STATUS.EM_EXECUCAO && statusAnterior === PROJETO_STATUS.SUSPENSO) {
      regras.push({
        tipo: 'MATERIAL',
        prioridade: 'ALTA',
        motivo: 'Verificação de materiais após reativação',
        prazoEstimadoDias: 2,
      });
      regras.push({
        tipo: 'EQUIPAMENTO',
        prioridade: 'ALTA',
        motivo: 'Verificação de equipamentos após reativação',
        prazoEstimadoDias: 2,
      });
      regras.push({
        tipo: 'INSPECAO',
        prioridade: 'URGENTE',
        motivo: 'Inspeção geral antes de retomar atividades',
        prazoEstimadoDias: 1,
      });
    }

    // Regra 4: Ao entrar em inspeção final
    if (statusNovo === PROJETO_STATUS.EM_INSPECAO) {
      regras.push({
        tipo: 'INSPECAO',
        prioridade: 'URGENTE',
        motivo: 'Inspeção final obrigatória',
        prazoEstimadoDias: 2,
      });
    }

    return regras;
  }

  /**
   * Valida se uma transição de status é permitida
   */
  private validarTransicaoStatus(statusAtual: Projeto_status, novoStatus: Projeto_status): boolean {
    const transicoesPermitidas = TRANSICOES_STATUS_PROJETO[statusAtual];
    return transicoesPermitidas ? transicoesPermitidas.includes(novoStatus) : false;
  }

  private async assertPermitRequirementsForFinalStatus(
    projeto: any,
    novoStatus: Projeto_status
  ): Promise<void> {
    const statusFinal =
      novoStatus === PROJETO_STATUS.CONCLUIDO || novoStatus === PROJETO_STATUS.ARQUIVADO;

    if (!statusFinal) {
      return;
    }

    const requiresPermit =
      Boolean((projeto as any).requiresPermit) || projeto?.Proposta?.permite === "SIM";

    if (!requiresPermit) {
      return;
    }

    const permits = Array.isArray(projeto?.projectPermits) ? projeto.projectPermits : [];

    if (permits.length === 0) {
      throw new ProjectServiceError(
        "Projeto requer permit aprovado para fechamento, mas não possui permits cadastrados",
        "PERMIT_CLOSEOUT_BLOCKED",
        409,
        {
          requiresPermit: true,
          statusSolicitado: novoStatus,
          reason: "NO_PERMITS",
          blockingPermits: [],
        }
      );
    }

    const blockingPermits = permits
      .filter((permit: any) => permit.status !== "APPROVED")
      .map((permit: any) => ({
        id: permit.id,
        permitNumber: permit.permitNumber,
        permitType: permit.permitType,
        jurisdiction: permit.jurisdiction,
        status: permit.status,
      }));

    if (blockingPermits.length > 0) {
      throw new ProjectServiceError(
        "Projeto requer permit aprovado para fechamento",
        "PERMIT_CLOSEOUT_BLOCKED",
        409,
        {
          requiresPermit: true,
          statusSolicitado: novoStatus,
          reason: "PENDING_OR_NON_APPROVED_PERMITS",
          blockingPermits,
        }
      );
    }
  }

  private async assertInspectionRequirementsForFinalStatus(
    projeto: any,
    novoStatus: Projeto_status
  ): Promise<void> {
    const statusFinal =
      novoStatus === PROJETO_STATUS.CONCLUIDO || novoStatus === PROJETO_STATUS.ARQUIVADO;

    if (!statusFinal) {
      return;
    }

    const inspections = Array.isArray(projeto?.projectInspections)
      ? projeto.projectInspections
      : [];

    if (inspections.length === 0) {
      return;
    }

    const hasRequiredFlags = inspections.some(
      (inspection: any) =>
        typeof inspection?.isRequired === "boolean" ||
        typeof inspection?.requiredForCloseout === "boolean"
    );

    const requiredInspections = hasRequiredFlags
      ? inspections.filter(
          (inspection: any) =>
            Boolean(
              inspection?.requiredForCloseout ?? inspection?.isRequired ?? false
            )
        )
      : inspections.filter((inspection: any) => inspection?.permitId != null);

    if (requiredInspections.length === 0) {
      return;
    }

    const blockingFailedOrReinspect = requiredInspections
      .filter((inspection: any) =>
        ["FAILED", "REINSPECT"].includes(String(inspection.status))
      )
      .map((inspection: any) => ({
        id: inspection.id,
        inspectionType: inspection.inspectionType,
        status: inspection.status,
        scheduledFor: inspection.scheduledFor,
      }));

    if (blockingFailedOrReinspect.length > 0) {
      throw new ProjectServiceError(
        "Projeto possui inspeções pendentes/reprovadas e não pode ser encerrado.",
        "INSPECTION_CLOSEOUT_BLOCKED",
        409,
        {
          reason: "FAILED_OR_REINSPECT",
          blockingInspections: blockingFailedOrReinspect,
        }
      );
    }

    const blockingPending = requiredInspections
      .filter((inspection: any) =>
        ["REQUESTED", "SCHEDULED"].includes(String(inspection.status))
      )
      .map((inspection: any) => ({
        id: inspection.id,
        inspectionType: inspection.inspectionType,
        status: inspection.status,
        scheduledFor: inspection.scheduledFor,
      }));

    if (blockingPending.length > 0) {
      throw new ProjectServiceError(
        "Projeto possui inspeções pendentes/reprovadas e não pode ser encerrado.",
        "INSPECTION_CLOSEOUT_BLOCKED",
        409,
        {
          reason: "PENDING_INSPECTIONS",
          blockingInspections: blockingPending,
        }
      );
    }
  }

  private async assertPunchListRequirementsForFinalStatus(
    projeto: any,
    novoStatus: Projeto_status
  ): Promise<void> {
    const statusFinal =
      novoStatus === PROJETO_STATUS.CONCLUIDO || novoStatus === PROJETO_STATUS.ARQUIVADO;

    if (!statusFinal) {
      return;
    }

    const punchItems = Array.isArray(projeto?.projectPunchItems)
      ? projeto.projectPunchItems
      : [];

    const blockingStatuses = ["OPEN", "IN_PROGRESS"];

    const blockingPunchItems = punchItems.filter((item: any) =>
      blockingStatuses.includes(String(item.status))
    );

    if (blockingPunchItems.length === 0) {
      return;
    }

    const counts = blockingPunchItems.reduce(
      (acc: Record<string, number>, item: any) => {
        const status = String(item.status);
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      { OPEN: 0, IN_PROGRESS: 0 }
    );

    const priorityOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    const topBlockingPunchItems = [...blockingPunchItems]
      .sort((a: any, b: any) => {
        const priorityA = priorityOrder[String(a.priority)] ?? 99;
        const priorityB = priorityOrder[String(b.priority)] ?? 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return Number(a.id) - Number(b.id);
      })
      .slice(0, 10)
      .map((item: any) => ({
        id: item.id,
        status: item.status,
        priority: item.priority,
        description: item.description,
        dueDate: item.dueDate,
        assignedToWorkerId: item.assignedToWorkerId,
      }));

    throw new ProjectServiceError(
      "Projeto não pode ser fechado: existem itens de punch list pendentes.",
      "PUNCH_CLOSEOUT_BLOCKED",
      409,
      {
        reason: "OPEN_OR_IN_PROGRESS_PUNCH_ITEMS",
        blockingPunchItems: topBlockingPunchItems,
        counts,
      }
    );
  }

  private async assertMaterialRequirementsForFinalStatus(
    projeto: any,
    novoStatus: Projeto_status
  ): Promise<void> {
    const statusFinal =
      novoStatus === PROJETO_STATUS.CONCLUIDO || novoStatus === PROJETO_STATUS.ARQUIVADO;

    if (!statusFinal) {
      return;
    }

    await this.materialMetricsService.recomputeProject(projeto.id, {
      dryRun: false,
      includeWarnings: false,
    });

    const blockers = await this.materialMetricsService.getCloseoutBlockers(projeto.id, {
      take: 10,
    });

    if (blockers.counts.totalBlocking === 0) {
      return;
    }

    throw new ProjectServiceError(
      "Projeto não pode ser fechado: existem materiais pendentes de triagem/baixa.",
      "MATERIAL_CLOSEOUT_BLOCKED",
      409,
      {
        reason: "MATERIALS_PENDING_CLOSEOUT",
        counts: blockers.counts,
        totalsPendingQty: blockers.totalsPendingQty.toFixed(4),
        blocking: blockers.blocking.map((item) => ({
          id: item.id,
          flowStatus: item.flowStatus,
          leftoverQty: item.leftoverQty.toFixed(4),
          plannedQty: item.plannedQty.toFixed(4),
          issuedQty: item.issuedQty.toFixed(4),
          consumedQty: item.consumedQty.toFixed(4),
          returnedQty: item.returnedQty.toFixed(4),
          wasteQty: item.wasteQty.toFixed(4),
          damagedQty: item.damagedQty.toFixed(4),
          lostQty: item.lostQty.toFixed(4),
        })),
      }
    );
  }

  /**
   * Dispara BudgetAlert persistente + notificação quando custoReal ultrapassa thresholds do projeto.
   * Chamado de forma não-bloqueante após atualizar custoReal.
   */
  private async checkAndFireBudgetAlerts(projetoId: number, numeroProjeto: string): Promise<void> {
    const proj = await this.prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { custoPrevisto: true, custoReal: true },
    });
    if (!proj?.custoPrevisto || !proj?.custoReal) return;

    const budget = Number(proj.custoPrevisto);
    const actual = Number(proj.custoReal);
    if (budget <= 0) return;

    const pct = (actual / budget) * 100;

    // Determine severity: CRITICAL (>110%), ALERT (>100%), WARNING (>80%)
    let severity: "WARNING" | "ALERT" | "CRITICAL" | null = null;
    if (pct >= 110) severity = "CRITICAL";
    else if (pct >= 100) severity = "ALERT";
    else if (pct >= 80) severity = "WARNING";

    if (!severity) return;

    // Avoid duplicate alerts for the same severity in the same day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.budgetAlert.findFirst({
      where: {
        projectId: projetoId,
        severity,
        triggeredAt: { gte: today },
      },
    });
    if (existing) return;

    // Persist BudgetAlert
    await this.prisma.budgetAlert.create({
      data: {
        projectId: projetoId,
        severity,
        thresholdPct: pct >= 110 ? 110 : pct >= 100 ? 100 : 80,
        custoAtual: actual,
        budgetTotal: budget,
        percentUsed: Number(pct.toFixed(2)),
        message: `Project ${numeroProjeto}: cost is at ${pct.toFixed(1)}% of budget (${severity})`,
      },
    });

    // Notify GERENTE and ADMIN
    const managers = await this.prisma.usuario.findMany({
      where: { nivel: { in: ["ADMIN", "GERENTE"] }, status: "ATIVO" },
      select: { id: true },
    });

    const title =
      severity === "CRITICAL" ? `⛔ Project Over Budget: ${numeroProjeto}` :
      severity === "ALERT" ? `🔴 Project At Budget Limit: ${numeroProjeto}` :
      `⚠️ Project Budget Warning: ${numeroProjeto}`;
    const message = `Cost is at ${pct.toFixed(1)}% of budget ($${actual.toFixed(2)} / $${budget.toFixed(2)}).`;

    for (const mgr of managers) {
      NotificationService.create({
        userId: mgr.id,
        type: severity === "CRITICAL" ? "error" : "warning",
        title,
        message,
        data: { projetoId, severity, percentUsed: pct.toFixed(1) },
      }).catch(() => {/* non-blocking */});
    }
  }

  /**
   * Mapeia entidade Prisma para DTO de resposta
   */
  private mapearParaResponse(projeto: any): ProjetoResponseDTO {
    return {
      id: projeto.id,
      numeroProjeto: projeto.numeroProjeto,
      titulo: projeto.titulo,
      descricao: projeto.descricao,
      status: projeto.status,
      prioridade: projeto.prioridade,
      clienteId: projeto.clienteId,
      clienteNome: projeto.cliente?.nomeFantasia || projeto.cliente?.razaoSocial,
      propostaId: projeto.propostaId,
      propostaNumero: projeto.proposta?.numeroProposta,
      responsavelId: projeto.responsavelId,
      responsavelNome: projeto.Responsavel?.nomeCompleto,
      dataInicio: projeto.dataInicioReal || projeto.dataInicioPrevista,
      dataPrevisao: projeto.dataConclusaoPrevista,
      dataConclusao: projeto.dataConclusaoReal,
      valorOrcado: projeto.valorEstimado ? Number(projeto.valorEstimado) : null,
      valorRealizado: projeto.custoReal ? Number(projeto.custoReal) : null,
      observacoes: null, // Campo não existe no schema Projeto
      criadoEm: projeto.criadoEm,
      atualizadoEm: projeto.atualizadoEm,
      criadoPorId: projeto.criadoPor,
      criadoPorNome: projeto.CriadoPor?.nomeCompleto,
      // Contadores (se disponíveis)
      totalEtapas: projeto._count?.Etapas,
      etapasConcluidas: undefined, // Requer query adicional
      totalTarefas: projeto._count?.Tarefas,
      tarefasConcluidas: undefined, // Requer query adicional
      totalMateriais: projeto._count?.Materiais,
      totalAnexos: projeto._count?.Anexos,
    };
  }
}
