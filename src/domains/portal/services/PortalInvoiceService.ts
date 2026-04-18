import { prisma } from "@/lib/prisma";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";

type CurrencyCode = "USD";

export type PortalInvoiceListItem = {
  id: number;
  invoiceNumber: string;
  status: string;
  issuedAt: Date;
  dueAt: Date;
  currency: CurrencyCode;
  total: number;
  amountPaid: number;
  balanceDue: number;
  pdfAvailable: boolean;
};

export type PortalInvoiceDetail = PortalInvoiceListItem;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toSafeInvoice(invoice: {
  id: number;
  numeroInvoice: string;
  status: string;
  dataEmissao: Date;
  dataVencimento: Date;
  valorTotal: unknown;
  valorPago: unknown;
  saldo: unknown;
  pdfStorageKey: string | null;
}): PortalInvoiceListItem {
  return {
    id: invoice.id,
    invoiceNumber: invoice.numeroInvoice,
    status: invoice.status,
    issuedAt: invoice.dataEmissao,
    dueAt: invoice.dataVencimento,
    currency: "USD",
    total: toNumber(invoice.valorTotal),
    amountPaid: toNumber(invoice.valorPago),
    balanceDue: toNumber(invoice.saldo),
    pdfAvailable: Boolean(invoice.pdfStorageKey),
  };
}

export class PortalInvoiceService {
  private prisma = prisma;
  private portalTokenService = new PortalTokenService();

  async listByToken(token: string): Promise<PortalInvoiceListItem[] | null> {
    const project = await this.portalTokenService.resolveSafeProjectByToken(token);
    if (!project) {
      return null;
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        projetoId: project.id,
      },
      orderBy: [{ dataEmissao: "desc" }, { id: "desc" }],
      select: {
        id: true,
        numeroInvoice: true,
        status: true,
        dataEmissao: true,
        dataVencimento: true,
        valorTotal: true,
        valorPago: true,
        saldo: true,
        pdfStorageKey: true,
      },
    });

    return invoices.map(toSafeInvoice);
  }

  async getByToken(token: string, invoiceId: number): Promise<PortalInvoiceDetail | null> {
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return null;
    }

    const project = await this.portalTokenService.resolveSafeProjectByToken(token);
    if (!project) {
      return null;
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        projetoId: project.id,
      },
      select: {
        id: true,
        numeroInvoice: true,
        status: true,
        dataEmissao: true,
        dataVencimento: true,
        valorTotal: true,
        valorPago: true,
        saldo: true,
        pdfStorageKey: true,
      },
    });

    if (!invoice) {
      return null;
    }

    return toSafeInvoice(invoice);
  }
}
