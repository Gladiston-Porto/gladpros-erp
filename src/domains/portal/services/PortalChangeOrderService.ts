import { prisma } from "@/lib/prisma";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";

export type PortalChangeOrderListItem = {
  id: number;
  code: string | null;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  summary: string | null;
};

export type PortalChangeOrderScopeChange = {
  id: number;
  type: string;
  description: string;
  qty: number;
};

export type PortalChangeOrderDetail = PortalChangeOrderListItem & {
  description: string;
  scopeChanges: PortalChangeOrderScopeChange[];
  scheduleImpactDays: number | null;
  decidedAt: Date | null;
  decidedBy: string | null;
};

function buildTitle(id: number, description: string): string {
  const compact = description.replace(/\s+/g, " ").trim();
  if (!compact) {
    return `Change Order #${id}`;
  }

  if (compact.length <= 72) {
    return compact;
  }

  return `${compact.slice(0, 69)}...`;
}

function buildSummary(description: string): string | null {
  const compact = description.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }

  if (compact.length <= 140) {
    return compact;
  }

  return `${compact.slice(0, 137)}...`;
}

export class PortalChangeOrderService {
  private prisma = prisma;
  private portalTokenService = new PortalTokenService();

  async listByToken(token: string): Promise<PortalChangeOrderListItem[] | null> {
    const project = await this.portalTokenService.resolveSafeProjectByToken(token);
    if (!project) {
      return null;
    }

    const changeOrders = await this.prisma.changeOrder.findMany({
      where: {
        projectId: project.id,
        jobType: "PROJECT",
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return changeOrders.map((changeOrder) => ({
      id: changeOrder.id,
      code: null,
      title: buildTitle(changeOrder.id, changeOrder.description),
      status: changeOrder.status,
      createdAt: changeOrder.createdAt,
      updatedAt: changeOrder.updatedAt,
      summary: buildSummary(changeOrder.description),
    }));
  }

  async getByToken(token: string, changeOrderId: number): Promise<PortalChangeOrderDetail | null> {
    if (!Number.isInteger(changeOrderId) || changeOrderId <= 0) {
      return null;
    }

    const project = await this.portalTokenService.resolveSafeProjectByToken(token);
    if (!project) {
      return null;
    }

    const changeOrder = await this.prisma.changeOrder.findFirst({
      where: {
        id: changeOrderId,
        projectId: project.id,
        jobType: "PROJECT",
      },
      select: {
        id: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        approvedByName: true,
        rejectedAt: true,
        rejectedByName: true,
        items: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            type: true,
            description: true,
            qty: true,
          },
        },
      },
    });

    if (!changeOrder) {
      return null;
    }

    return {
      id: changeOrder.id,
      code: null,
      title: buildTitle(changeOrder.id, changeOrder.description),
      status: changeOrder.status,
      createdAt: changeOrder.createdAt,
      updatedAt: changeOrder.updatedAt,
      summary: buildSummary(changeOrder.description),
      description: changeOrder.description,
      scopeChanges: changeOrder.items.map((item) => ({
        id: item.id,
        type: item.type,
        description: item.description,
        qty: Number(item.qty),
      })),
      scheduleImpactDays: null,
      decidedAt: changeOrder.status === "APPROVED" ? changeOrder.approvedAt : changeOrder.status === "REJECTED" ? changeOrder.rejectedAt : null,
      decidedBy:
        changeOrder.status === "APPROVED"
          ? changeOrder.approvedByName
          : changeOrder.status === "REJECTED"
            ? changeOrder.rejectedByName
            : null,
    };
  }
}
