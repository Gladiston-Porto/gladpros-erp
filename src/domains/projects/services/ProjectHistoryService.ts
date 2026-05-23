/**
 * ProjectHistoryService
 * Serviço para registro de histórico e auditoria de projetos
 */

import { prisma } from "@/lib/prisma";
import { ProjetoHistorico, AcaoHistorico } from "../entities";
import { ListarHistoricoDTO, PaginatedResponse } from "../dtos";

export interface RegistrarHistoricoDTO {
  projetoId: number;
  usuarioId: number;
  acao: AcaoHistorico | string;
  detalhes: string | Record<string, any>;
}

export class ProjectHistoryService {
  private prisma = prisma;

  /**
   * Registra um evento no histórico do projeto
   */
  async registrar(data: RegistrarHistoricoDTO): Promise<ProjetoHistorico> {
    return await this.prisma.projetoHistorico.create({
      data: {
        projetoId: data.projetoId,
        usuarioId: data.usuarioId,
        acao: data.acao,
        detalhes: data.detalhes ?? null,
      },
    }) as unknown as ProjetoHistorico;
  }

  /**
   * Lista o histórico de um projeto com paginação
   */
  async listar(
    projetoId: number,
    filtros: ListarHistoricoDTO
  ): Promise<PaginatedResponse<ProjetoHistorico>> {
    const { pagina = 1, limite = 50, acoes, usuarioId, dataInicio, dataFim } = filtros;
    const skip = (pagina - 1) * limite;

    const where: any = {
      projetoId,
    };

    if (acoes && acoes.length > 0) {
      where.acao = { in: acoes };
    }

    if (usuarioId) {
      where.usuarioId = usuarioId;
    }

    if (dataInicio || dataFim) {
      where.criadoEm = {};
      if (dataInicio) {
        where.criadoEm.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.criadoEm.lte = new Date(dataFim);
      }
    }

    const [historicos, total] = await Promise.all([
      this.prisma.projetoHistorico.findMany({
        where,
        skip,
        take: limite,
        orderBy: { criadoEm: 'desc' },
        include: {
          Usuario: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.projetoHistorico.count({ where }),
    ]);

    const totalPaginas = Math.ceil(total / limite);

    return {
      data: historicos as unknown as ProjetoHistorico[],
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
   * Busca histórico por ID
   */
  async buscarPorId(id: number): Promise<ProjetoHistorico | null> {
    return await this.prisma.projetoHistorico.findUnique({
      where: { id },
      include: {
        Usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
      },
    }) as unknown as ProjetoHistorico | null;
  }

  /**
   * Obtém último evento de um tipo específico
   */
  async obterUltimoEvento(
    projetoId: number,
    acao: AcaoHistorico
  ): Promise<ProjetoHistorico | null> {
    return await this.prisma.projetoHistorico.findFirst({
      where: {
        projetoId,
        acao,
      },
      orderBy: {
        criadoEm: 'desc',
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    }) as unknown as ProjetoHistorico | null;
  }

  /**
   * Conta eventos de um tipo específico
   */
  async contarEventos(projetoId: number, acao?: AcaoHistorico): Promise<number> {
    return await this.prisma.projetoHistorico.count({
      where: {
        projetoId,
        ...(acao && { acao }),
      },
    });
  }
}
