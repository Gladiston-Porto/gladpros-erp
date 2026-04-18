import { checkRateLimit } from "@/domains/portal/security/rate-limit";
import { hashPortalAccessToken } from "@/domains/projects/services/portal-token";
import { PortalInvoiceDetail, PortalInvoiceListItem, PortalInvoiceService } from "@/domains/portal/services/PortalInvoiceService";

const PORTAL_INVOICE_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

export type PortalInvoicesListView = {
  invoices: PortalInvoiceListItem[];
};

export type PortalInvoiceDetailView = {
  invoice: PortalInvoiceDetail;
};

function checkPortalInvoiceRateLimit(token: string, ip: string): boolean {
  const ipLimit = checkRateLimit(`portal:inv:ip:${ip}`, PORTAL_INVOICE_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return false;
  }

  const tokenHashPrefix = hashPortalAccessToken(token).slice(0, 12);
  const ipTokenLimit = checkRateLimit(`portal:inv:iptoken:${ip}:${tokenHashPrefix}`, PORTAL_INVOICE_RATE_LIMIT);
  return ipTokenLimit.allowed;
}

export async function resolvePortalInvoicesListView(token: string, ip: string): Promise<PortalInvoicesListView | null> {
  if (!checkPortalInvoiceRateLimit(token, ip)) {
    return null;
  }

  const portalInvoiceService = new PortalInvoiceService();
  const invoices = await portalInvoiceService.listByToken(token);

  if (!invoices) {
    return null;
  }

  return {
    invoices,
  };
}

export async function resolvePortalInvoiceDetailView(
  token: string,
  invoiceId: number,
  ip: string
): Promise<PortalInvoiceDetailView | null> {
  if (!checkPortalInvoiceRateLimit(token, ip)) {
    return null;
  }

  const portalInvoiceService = new PortalInvoiceService();
  const invoice = await portalInvoiceService.getByToken(token, invoiceId);

  if (!invoice) {
    return null;
  }

  return {
    invoice,
  };
}
