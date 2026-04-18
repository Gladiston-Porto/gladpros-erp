import { prisma } from "@/lib/prisma";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";

export type PortalChangeOrderDecisionAction = "approve" | "reject";

export type DecideByTokenInput = {
  token: string;
  changeOrderId: number;
  action: PortalChangeOrderDecisionAction;
  name: string;
  ip: string;
  userAgent: string;
};

export type PortalChangeOrderDecisionResult = {
  status: "approved" | "rejected";
  decidedAt: Date;
  decidedBy: string;
};

function normalizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function normalizeUserAgent(userAgent: string): string {
  const compact = userAgent.trim();
  if (!compact) {
    return "unknown";
  }

  return compact.slice(0, 255);
}

export class PortalChangeOrderDecisionService {
  private prisma = prisma;
  private portalTokenService = new PortalTokenService();

  async decideByToken(input: DecideByTokenInput): Promise<PortalChangeOrderDecisionResult | null> {
    const name = normalizeName(input.name);

    if (!Number.isInteger(input.changeOrderId) || input.changeOrderId <= 0) {
      return null;
    }

    if (input.action !== "approve" && input.action !== "reject") {
      return null;
    }

    if (name.length < 2 || name.length > 120) {
      return null;
    }

    const project = await this.portalTokenService.resolveSafeProjectByToken(input.token);
    if (!project) {
      return null;
    }

    const changeOrder = await this.prisma.changeOrder.findFirst({
      where: {
        id: input.changeOrderId,
        projectId: project.id,
        jobType: "PROJECT",
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!changeOrder) {
      return null;
    }

    if (changeOrder.status !== "SENT") {
      return null;
    }

    const now = new Date();
    const normalizedUserAgent = normalizeUserAgent(input.userAgent);

    if (input.action === "approve") {
      await this.prisma.changeOrder.update({
        where: { id: changeOrder.id },
        data: {
          status: "APPROVED",
          approvedAt: now,
          approvedByName: name,
          approvedIp: input.ip,
          approvedUserAgent: normalizedUserAgent,
        },
      });

      return {
        status: "approved",
        decidedAt: now,
        decidedBy: name,
      };
    }

    await this.prisma.changeOrder.update({
      where: { id: changeOrder.id },
      data: {
        status: "REJECTED",
        rejectedAt: now,
        rejectedByName: name,
        rejectedIp: input.ip,
        rejectedUserAgent: normalizedUserAgent,
      },
    });

    return {
      status: "rejected",
      decidedAt: now,
      decidedBy: name,
    };
  }
}
