import { prisma } from "@/lib/prisma";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";

export type PortalCloseoutSafe = {
  status: string;
  generatedAt: Date | null;
  deliveredAt: Date | null;
  acceptedAt: Date | null;
  downloadAvailable: boolean;
};

export type PortalCloseoutDownloadMeta = {
  documentUrl: string;
};

export class PortalCloseoutService {
  private prisma = prisma;
  private portalTokenService = new PortalTokenService();

  async getByToken(token: string): Promise<PortalCloseoutSafe | null> {
    const project = await this.portalTokenService.resolveSafeProjectByToken(token);
    if (!project) {
      return null;
    }

    const closeout = await this.prisma.projectCloseout.findUnique({
      where: { projectId: project.id },
      select: {
        status: true,
        generatedAt: true,
        deliveredAt: true,
        clientAcceptedAt: true,
        documentUrl: true,
      },
    });

    if (!closeout) {
      return null;
    }

    return {
      status: closeout.status,
      generatedAt: closeout.generatedAt,
      deliveredAt: closeout.deliveredAt,
      acceptedAt: closeout.clientAcceptedAt,
      downloadAvailable: Boolean(closeout.documentUrl),
    };
  }

  async getDownloadMetaByToken(token: string): Promise<PortalCloseoutDownloadMeta | null> {
    const project = await this.portalTokenService.resolveSafeProjectByToken(token);
    if (!project) {
      return null;
    }

    const closeout = await this.prisma.projectCloseout.findUnique({
      where: { projectId: project.id },
      select: {
        documentUrl: true,
      },
    });

    if (!closeout?.documentUrl) {
      return null;
    }

    return {
      documentUrl: closeout.documentUrl,
    };
  }
}
