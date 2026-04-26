import { AlertCircle, CheckCircle, Clock } from "lucide-react";

import type {
  InvoiceDetail,
  InvoiceListItem,
} from "./types";

type InvoiceStatusVariant = "default" | "primary" | "success" | "warning" | "error";

export function formatInvoiceCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatInvoiceDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

export function getInvoiceStatusBadgeVariant(status: string): InvoiceStatusVariant {
  const variants: Record<string, InvoiceStatusVariant> = {
    DRAFT: "default",
    SENT: "primary",
    VIEWED: "primary",
    PARTIAL_PAID: "warning",
    PAID: "success",
    OVERDUE: "error",
    CANCELLED: "default",
  };

  return variants[status] || "default";
}

export function getInvoiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviada",
    VIEWED: "Visualizada",
    PARTIAL_PAID: "Parcialmente Paga",
    PAID: "Paga",
    OVERDUE: "Vencida",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status;
}

export function getInvoiceStatusIcon(status: string) {
  switch (status) {
    case "PAID":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "OVERDUE":
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Clock className="h-5 w-5 text-brand-primary" />;
  }
}

export function calculateInvoiceItemSubtotal(
  item: Pick<InvoiceDetail["itens"][number], "quantidade" | "precoUnitario" | "desconto"> |
    Pick<InvoiceListItem, never> & {
      quantidade: number;
      precoUnitario: number;
      desconto: number;
    }
) {
  return item.quantidade * item.precoUnitario - item.desconto;
}

export function getInvoiceFinancialTotals(invoice: InvoiceDetail) {
  return {
    subtotal: Number(invoice.subtotal),
    descontoValor: Number(invoice.descontoValor),
    descontoPercentual: Number(invoice.descontoPercentual),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    taxableAmount: invoice.taxableAmount != null ? Number(invoice.taxableAmount) : null,
    nonTaxableAmount: invoice.nonTaxableAmount != null ? Number(invoice.nonTaxableAmount) : null,
    taxMode: invoice.taxMode ?? null,
    taxScenario: invoice.taxScenario ?? null,
    taxExplanation: invoice.taxExplanation ?? null,
    valorTotal: Number(invoice.valorTotal),
    valorPago: Number(invoice.valorPago),
    saldo: Number(invoice.saldo),
  };
}

export function normalizeInvoiceListItem(raw: any): InvoiceListItem {
  return {
    id: Number(raw.id),
    numeroInvoice: String(raw.numeroInvoice ?? ""),
    cliente: {
      nome: raw.cliente?.nome ?? raw.cliente?.nomeCompleto ?? raw.cliente?.nomeFantasia ?? raw.cliente?.razaoSocial ?? "-",
      email: raw.cliente?.email ?? "-",
    },
    projeto: raw.projeto
      ? {
          nome: raw.projeto.nome ?? raw.projeto.titulo ?? "-",
        }
      : undefined,
    dataEmissao: raw.dataEmissao ?? raw.criadoEm,
    dataVencimento: raw.dataVencimento,
    valorTotal: Number(raw.valorTotal ?? 0),
    valorPago: Number(raw.valorPago ?? 0),
    saldo: Number(raw.saldo ?? 0),
    status: String(raw.status ?? "DRAFT"),
    _count: {
      pagamentos: Number(raw._count?.pagamentos ?? 0),
    },
  };
}

export function normalizeInvoiceDetail(raw: any): InvoiceDetail {
  return {
    ...raw,
    cliente: {
      ...raw.cliente,
      nome: raw.cliente?.nome ?? raw.cliente?.nomeCompleto ?? raw.cliente?.nomeFantasia ?? raw.cliente?.razaoSocial ?? "-",
      email: raw.cliente?.email ?? "-",
    },
    projeto: raw.projeto
      ? {
          ...raw.projeto,
          nome: raw.projeto.nome ?? raw.projeto.titulo ?? "-",
        }
      : undefined,
    criador: {
      ...raw.criador,
      nome: raw.criador?.nome ?? raw.criador?.nomeCompleto ?? "-",
      email: raw.criador?.email ?? "-",
    },
    pagamentos: Array.isArray(raw.pagamentos)
      ? raw.pagamentos.map((pagamento: any) => ({
          ...pagamento,
          valor: Number(pagamento.valor ?? 0),
          criador: {
            ...pagamento.criador,
            nome: pagamento.criador?.nome ?? pagamento.criador?.nomeCompleto ?? "-",
          },
        }))
      : [],
    itens: Array.isArray(raw.itens)
      ? raw.itens.map((item: any) => ({
          ...item,
          quantidade: Number(item.quantidade ?? 0),
          precoUnitario: Number(item.precoUnitario ?? 0),
          desconto: Number(item.desconto ?? 0),
          subtotal: Number(item.subtotal ?? 0),
        }))
      : [],
  };
}
