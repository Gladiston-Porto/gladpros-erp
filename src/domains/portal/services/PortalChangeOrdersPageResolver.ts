import { checkRateLimit } from "@/domains/portal/security/rate-limit";
import { hashPortalAccessToken } from "@/domains/projects/services/portal-token";
import { PortalChangeOrderDetail, PortalChangeOrderListItem, PortalChangeOrderService } from "./PortalChangeOrderService";

const PORTAL_CO_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

export type PortalChangeOrdersListView = {
  changeOrders: PortalChangeOrderListItem[];
};

export type PortalChangeOrderDetailView = {
  changeOrder: PortalChangeOrderDetail;
};

function checkPortalCoRateLimit(token: string, ip: string): boolean {
  const ipLimit = checkRateLimit(`portal:co:ip:${ip}`, PORTAL_CO_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return false;
  }

  const tokenHashPrefix = hashPortalAccessToken(token).slice(0, 12);
  const ipTokenLimit = checkRateLimit(`portal:co:iptoken:${ip}:${tokenHashPrefix}`, PORTAL_CO_RATE_LIMIT);
  return ipTokenLimit.allowed;
}

export async function resolvePortalChangeOrdersListView(token: string, ip: string): Promise<PortalChangeOrdersListView | null> {
  if (!checkPortalCoRateLimit(token, ip)) {
    return null;
  }

  const portalChangeOrderService = new PortalChangeOrderService();
  const changeOrders = await portalChangeOrderService.listByToken(token);

  if (!changeOrders) {
    return null;
  }

  return {
    changeOrders,
  };
}

export async function resolvePortalChangeOrderDetailView(
  token: string,
  changeOrderId: number,
  ip: string
): Promise<PortalChangeOrderDetailView | null> {
  if (!checkPortalCoRateLimit(token, ip)) {
    return null;
  }

  const portalChangeOrderService = new PortalChangeOrderService();
  const changeOrder = await portalChangeOrderService.getByToken(token, changeOrderId);

  if (!changeOrder) {
    return null;
  }

  return {
    changeOrder,
  };
}
