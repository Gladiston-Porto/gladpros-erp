/**
 * ProjectAttachmentService
 * Serviço para gerenciamento de anexos de projetos
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ACAO_HISTORICO } from "../entities";
import { CreateProjetoAnexoDTO, ProjetoAnexoResponseDTO } from "../dtos";
import { ProjectHistoryService } from "./ProjectHistoryService";

export class ProjectAttachmentServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ProjectAttachmentServiceError";
  }
}

export class ProjectAttachmentService {
  private prisma = prisma;
  private historyService = new ProjectHistoryService();

  /**
   * Cria um novo anexo (registra upload)
   */
  async criar(data: CreateProjetoAnexoDTO, usuarioId: number): Promise<ProjetoAnexoResponseDTO> {
    // Valida se projeto existe
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: data.projetoId },
    });

    if (!projeto) {
      throw new ProjectAttachmentServiceError(
        "Projeto não encontrado",
        "PROJETO_NAO_ENCONTRADO",
        404
      );
    }

    const anexo = await this.prisma.projetoAnexo.create({
      data: {
        projetoId: data.projetoId,
        arquivoUrl: data.arquivoUrl,
        rotulo: data.rotulo ?? null,
        publicoCliente: data.publicoCliente ?? false,
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
      projetoId: data.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.ANEXO_ADICIONADO,
      detalhes: `Anexo "${data.rotulo || data.arquivoUrl}" adicionado`,
    });

    return this.mapearParaResponse(anexo);
  }

  /**
   * Busca anexo por ID
   */
  async buscarPorId(id: number): Promise<ProjetoAnexoResponseDTO | null> {
    const anexo = await this.prisma.projetoAnexo.findUnique({
      where: { id },
      include: {
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
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

    if (!anexo) {
      return null;
    }

    return this.mapearParaResponse(anexo);
  }

  /**
   * Lista anexos de um projeto
   */
  async listarPorProjeto(
    projetoId: number,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<ProjetoAnexoResponseDTO[]> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 100;
    const anexos = await this.prisma.projetoAnexo.findMany({
      where: { projetoId },
      orderBy: { criadoEm: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
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

    return anexos.map((a) => this.mapearParaResponse(a));
  }

  /**
   * Exclui um anexo
   * NOTA: Esta função apenas remove o registro. A exclusão física do arquivo
   * deve ser feita separadamente pela camada de aplicação.
   */
  async excluir(id: number, usuarioId: number): Promise<ProjetoAnexoResponseDTO> {
    const anexo = await this.prisma.projetoAnexo.findUnique({
      where: { id },
    });

    if (!anexo) {
      throw new ProjectAttachmentServiceError(
        "Anexo não encontrado",
        "ANEXO_NAO_ENCONTRADO",
        404
      );
    }

    // Remove o registro
    const anexoExcluido = await this.prisma.projetoAnexo.delete({
      where: { id },
    });

    // Registra no histórico
    await this.historyService.registrar({
      projetoId: anexo.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.ANEXO_REMOVIDO,
      detalhes: `Anexo "${anexo.rotulo || anexo.arquivoUrl}" removido`,
    });

    return this.mapearParaResponse(anexoExcluido);
  }

  /**
   * Obtém estatísticas de anexos de um projeto
   */
  async obterEstatisticas(projetoId: number): Promise<{
    totalAnexos: number;
    tamanhoTotal: number;
    tiposArquivo: Record<string, number>;
  }> {
    const totalAnexos = await this.prisma.projetoAnexo.count({
      where: { projetoId },
    });

    return {
      totalAnexos,
      tamanhoTotal: 0,
      tiposArquivo: {},
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private mapearParaResponse(anexo: unknown): ProjetoAnexoResponseDTO {
    const a = anexo as Prisma.ProjetoAnexoGetPayload<{
      include: {
        Projeto: { select: { numeroProjeto: true; titulo: true } };
        CriadoPor: { select: { nomeCompleto: true } };
      };
    }>;

    return {
      id: a.id,
      projetoId: a.projetoId,
      projetoNumeroProjeto: a.Projeto?.numeroProjeto,
      projetoTitulo: a.Projeto?.titulo,
      arquivoUrl: a.arquivoUrl,
      rotulo: a.rotulo,
      publicoCliente: a.publicoCliente,
      criadoPorId: a.criadoPor,
      criadoPorNome: a.CriadoPor?.nomeCompleto ?? undefined,
      criadoEm: a.criadoEm,
    };
  }

  private formatarTamanho(bytes?: number | null): string | undefined {
    if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
      return undefined;
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
