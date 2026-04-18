import { prisma } from "@/lib/prisma";
import { generatePortalAccessToken, hashPortalAccessToken, isPortalAccessTokenFormatValid } from "./portal-token";

export type PortalProjectStageSafe = {
  id: number;
  servico: string;
  status: string;
  ordem: number;
  porcentagem: number;
  inicioPrevisto: Date | null;
  fimPrevisto: Date | null;
  inicioReal: Date | null;
  fimReal: Date | null;
};

export type PortalProjectSafePayload = {
  id: number;
  numeroProjeto: string;
  titulo: string;
  status: string;
  dataInicioPrevista: Date | null;
  dataConclusaoPrevista: Date | null;
  dataInicioReal: Date | null;
  dataConclusaoReal: Date | null;
  completionPercent: number;
  etapas: PortalProjectStageSafe[];
};

export type PortalTokenIssueResult = {
  projectId: number;
  token: string;
  tokenHash: string;
  createdAt: Date;
};

export class PortalTokenServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "PortalTokenServiceError";
  }
}

const TOKEN_MAX_GENERATION_ATTEMPTS = 5;

export class PortalTokenService {
  private prisma = prisma;

  async issueToken(projectId: number): Promise<PortalTokenIssueResult> {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new PortalTokenServiceError("ID do projeto inválido", "PROJECT_ID_INVALID", 422);
    }

    const projectExists = await this.prisma.projeto.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!projectExists) {
      throw new PortalTokenServiceError("Projeto não encontrado", "PROJECT_NOT_FOUND", 404, { projectId });
    }

    for (let attempt = 1; attempt <= TOKEN_MAX_GENERATION_ATTEMPTS; attempt++) {
      const token = generatePortalAccessToken();
      const tokenHash = hashPortalAccessToken(token);
      const createdAt = new Date();

      try {
        await this.prisma.projeto.update({
          where: { id: projectId },
          data: {
            portalTokenHash: tokenHash,
            portalTokenCreatedAt: createdAt,
            portalTokenRevokedAt: null,
          },
        });

        return {
          projectId,
          token,
          tokenHash,
          createdAt,
        };
      } catch (error) {
        if (this.isPrismaUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new PortalTokenServiceError(
      "Falha ao gerar token único do portal",
      "PORTAL_TOKEN_GENERATION_FAILED",
      500,
      { projectId }
    );
  }

  async revokeToken(projectId: number): Promise<void> {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new PortalTokenServiceError("ID do projeto inválido", "PROJECT_ID_INVALID", 422);
    }

    const updated = await this.prisma.projeto.updateMany({
      where: {
        id: projectId,
        portalTokenHash: { not: null },
        portalTokenRevokedAt: null,
      },
      data: {
        portalTokenRevokedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const exists = await this.prisma.projeto.findUnique({
        where: { id: projectId },
        select: { id: true },
      });

      if (!exists) {
        throw new PortalTokenServiceError("Projeto não encontrado", "PROJECT_NOT_FOUND", 404, { projectId });
      }
    }
  }

  async resolveSafeProjectByToken(token: string): Promise<PortalProjectSafePayload | null> {
    if (!isPortalAccessTokenFormatValid(token)) {
      return null;
    }

    const tokenHash = hashPortalAccessToken(token);

    const project = await this.prisma.projeto.findFirst({
      where: {
        portalTokenHash: tokenHash,
        portalTokenRevokedAt: null,
      },
      select: {
        id: true,
        numeroProjeto: true,
        titulo: true,
        status: true,
        dataInicioPrevista: true,
        dataConclusaoPrevista: true,
        dataInicioReal: true,
        dataConclusaoReal: true,
        Etapas: {
          orderBy: [{ ordem: "asc" }, { id: "asc" }],
          select: {
            id: true,
            servico: true,
            status: true,
            ordem: true,
            porcentagem: true,
            inicioPrevisto: true,
            fimPrevisto: true,
            inicioReal: true,
            fimReal: true,
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    const etapas = project.Etapas.map((etapa) => ({
      id: etapa.id,
      servico: etapa.servico,
      status: etapa.status,
      ordem: etapa.ordem,
      porcentagem: Number(etapa.porcentagem ?? 0),
      inicioPrevisto: etapa.inicioPrevisto,
      fimPrevisto: etapa.fimPrevisto,
      inicioReal: etapa.inicioReal,
      fimReal: etapa.fimReal,
    }));

    const completionPercent = etapas.length
      ? Number((etapas.reduce((sum, etapa) => sum + etapa.porcentagem, 0) / etapas.length).toFixed(2))
      : 0;

    return {
      id: project.id,
      numeroProjeto: project.numeroProjeto,
      titulo: project.titulo,
      status: project.status,
      dataInicioPrevista: project.dataInicioPrevista,
      dataConclusaoPrevista: project.dataConclusaoPrevista,
      dataInicioReal: project.dataInicioReal,
      dataConclusaoReal: project.dataConclusaoReal,
      completionPercent,
      etapas,
    };
  }

  private isPrismaUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    );
  }
}
