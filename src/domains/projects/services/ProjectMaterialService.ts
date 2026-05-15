/**
 * ProjectMaterialService
 * Serviço para gerenciamento de materiais de projetos
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  ProjetoMaterial_status,
  TRANSICOES_STATUS_MATERIAL,
  ACAO_HISTORICO,
} from "../entities";
import {
  CreateProjetoMaterialDTO,
  UpdateProjetoMaterialDTO,
  AlterarStatusMaterialDTO,
  ProjetoMaterialResponseDTO,
} from "../dtos";
import { ProjectHistoryService } from "./ProjectHistoryService";

export class ProjectMaterialServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ProjectMaterialServiceError";
  }
}

export class ProjectMaterialService {
  private prisma = prisma;
  private historyService = new ProjectHistoryService();

  /**
   * Cria um novo material
   */
  async criar(data: CreateProjetoMaterialDTO, usuarioId: number): Promise<ProjetoMaterialResponseDTO> {
    // Valida se projeto existe
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: data.projetoId },
    });

    if (!projeto) {
      throw new ProjectMaterialServiceError(
        "Projeto não encontrado",
        "PROJETO_NAO_ENCONTRADO",
        404
      );
    }

    const material = await this.prisma.projetoMaterial.create({
      data: {
        projetoId: data.projetoId,
        nome: data.nome,
        quantidadePlanejada: data.quantidadePlanejada,
        unidade: data.unidade,
        status: 'planejado',
      },
      select: {
        id: true,
        projetoId: true,
        nome: true,
        quantidadePlanejada: true,
        unidade: true,
        status: true,
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
      acao: ACAO_HISTORICO.MATERIAL_ALOCADO,
      detalhes: `Material "${data.nome}" alocado (${data.quantidadePlanejada} ${data.unidade})`,
    });

    return this.mapearParaResponse(material);
  }

  /**
   * Busca material por ID
   */
  async buscarPorId(id: number): Promise<ProjetoMaterialResponseDTO | null> {
    const material = await this.prisma.projetoMaterial.findUnique({
      where: { id },
      include: {
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
      },
    });

    if (!material) {
      return null;
    }

    return this.mapearParaResponse(material);
  }

  /**
   * Lista materiais de um projeto
   */
  async listarPorProjeto(
    projetoId: number,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<ProjetoMaterialResponseDTO[]> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 100;
    const materiais = await this.prisma.projetoMaterial.findMany({
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
      },
    });

    return materiais.map((m) => this.mapearParaResponse(m));
  }

  /**
   * Atualiza um material
   */
  async atualizar(
    id: number,
    data: UpdateProjetoMaterialDTO,
    usuarioId: number
  ): Promise<ProjetoMaterialResponseDTO> {
    const materialExistente = await this.prisma.projetoMaterial.findUnique({
      where: { id },
    });

    if (!materialExistente) {
      throw new ProjectMaterialServiceError(
        "Material não encontrado",
        "MATERIAL_NAO_ENCONTRADO",
        404
      );
    }

    const material = await this.prisma.projetoMaterial.update({
      where: { id },
      data: {
        nome: data.nome,
        quantidadePlanejada: data.quantidadePlanejada,
        unidade: data.unidade,
      },
      include: {
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
      projetoId: materialExistente.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.MATERIAL_ALOCADO,
      detalhes: `Material "${material.nome}" atualizado`,
    });

    return this.mapearParaResponse(material);
  }

  /**
   * Altera o status de um material
   */
  async alterarStatus(
    id: number,
    data: AlterarStatusMaterialDTO,
    usuarioId: number
  ): Promise<ProjetoMaterialResponseDTO> {
    const material = await this.prisma.projetoMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      throw new ProjectMaterialServiceError(
        "Material não encontrado",
        "MATERIAL_NAO_ENCONTRADO",
        404
      );
    }

    // Valida transição de status
    if (!this.validarTransicaoStatus(material.status, data.novoStatus)) {
      throw new ProjectMaterialServiceError(
        `Transição de status inválida: ${material.status} → ${data.novoStatus}`,
        "TRANSICAO_INVALIDA",
        400
      );
    }

    // Se devolvido, registra data de devolução
    const updateData: Prisma.ProjetoMaterialUpdateInput = {
      status: data.novoStatus,
    };

    const materialAtualizado = await this.prisma.projetoMaterial.update({
      where: { id },
      data: updateData,
      include: {
        Projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true,
          },
        },
      },
    });

    // Escolhe a ação de histórico apropriada
    const acao = data.novoStatus === 'finalizado'
      ? ACAO_HISTORICO.MATERIAL_DEVOLVIDO
      : ACAO_HISTORICO.MATERIAL_ALOCADO;

    await this.historyService.registrar({
      projetoId: material.projetoId,
      usuarioId,
      acao,
      detalhes: data.observacao || `Material "${material.nome}": ${material.status} → ${data.novoStatus}`,
    });

    return this.mapearParaResponse(materialAtualizado);
  }

  /**
   * Exclui um material
   */
  async excluir(id: number, usuarioId: number): Promise<void> {
    const material = await this.prisma.projetoMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      throw new ProjectMaterialServiceError(
        "Material não encontrado",
        "MATERIAL_NAO_ENCONTRADO",
        404
      );
    }

    // Não permite exclusão de materiais em uso
    if (material.status === 'em_uso' || material.status === 'devolucao_pendente') {
      throw new ProjectMaterialServiceError(
        "Não é possível excluir materiais em uso ou com devolução pendente",
        "EXCLUSAO_NAO_PERMITIDA",
        400
      );
    }

    await this.prisma.projetoMaterial.delete({
      where: { id },
    });

    await this.historyService.registrar({
      projetoId: material.projetoId,
      usuarioId,
      acao: ACAO_HISTORICO.MATERIAL_DEVOLVIDO,
      detalhes: `Material "${material.nome}" excluído`,
    });
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private validarTransicaoStatus(statusAtual: ProjetoMaterial_status, novoStatus: ProjetoMaterial_status): boolean {
    const transicoesPermitidas = TRANSICOES_STATUS_MATERIAL[statusAtual];
    return transicoesPermitidas ? transicoesPermitidas.includes(novoStatus) : false;
  }

  private mapearParaResponse(material: any): ProjetoMaterialResponseDTO {
    return {
      id: material.id,
      projetoId: material.projetoId,
      projetoNumeroProjeto: material.Projeto?.numeroProjeto,
      projetoTitulo: material.Projeto?.titulo,
      nome: material.nome,
      quantidadePlanejada: Number(material.quantidadePlanejada ?? 0),
      unidade: material.unidade ?? '',
      status: material.status as ProjetoMaterial_status,
      criadoEm: material.criadoEm,
      atualizadoEm: material.atualizadoEm ?? material.criadoEm,
    };
  }
}
