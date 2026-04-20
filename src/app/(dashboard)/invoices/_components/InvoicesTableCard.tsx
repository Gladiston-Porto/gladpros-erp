import { Download, FileText, Send } from "lucide-react";

import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card"
import { EmptyState } from "@gladpros/ui/empty-state";
import { Loading } from "@gladpros/ui/loading";

import {
  formatInvoiceCurrency,
  formatInvoiceDate,
  getInvoiceStatusBadgeVariant,
  getInvoiceStatusLabel,
} from "./invoice-utils";
import type { InvoiceListItem, InvoicePagination } from "./types";

type InvoicesTableCardProps = {
  invoices: InvoiceListItem[];
  loading: boolean;
  pagination: InvoicePagination;
  downloading: number | null;
  sending: number | null;
  onOpenInvoice: (invoiceId: number) => void;
  onCreateInvoice: () => void;
  onDownloadPDF: (invoiceId: number, event: React.MouseEvent) => void;
  onSendEmail: (invoiceId: number, event: React.MouseEvent) => void;
  onPageChange: (page: number) => void;
};

export function InvoicesTableCard({
  invoices,
  loading,
  pagination,
  downloading,
  sending,
  onOpenInvoice,
  onCreateInvoice,
  onDownloadPDF,
  onSendEmail,
  onPageChange,
}: InvoicesTableCardProps) {
  return (
    <Card className="border-none shadow-sm">
      {loading ? (
        <CardContent className="py-12">
          <Loading text="Carregando invoices..." />
        </CardContent>
      ) : invoices.length === 0 ? (
        <CardContent className="py-4">
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="Nenhuma invoice encontrada"
            description="Crie a primeira invoice para começar a faturar."
            actions={
              <Button variant="default" onClick={onCreateInvoice}>
                Criar primeira invoice
              </Button>
            }
          />
        </CardContent>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Projeto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => onOpenInvoice(invoice.id)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {invoice.numeroInvoice}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatInvoiceDate(invoice.dataEmissao)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {invoice.cliente.nome}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.cliente.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {invoice.projeto?.nome || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      {formatInvoiceDate(invoice.dataVencimento)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="text-sm font-medium text-foreground">
                        {formatInvoiceCurrency(invoice.valorTotal)}
                      </div>
                      {invoice._count.pagamentos > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {invoice._count.pagamentos} pagamento(s)
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div
                        className={`text-sm font-medium ${
                          invoice.saldo > 0 ? "text-destructive" : "text-green-600"
                        }`}
                      >
                        {formatInvoiceCurrency(invoice.saldo)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <Badge variant={getInvoiceStatusBadgeVariant(invoice.status)}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(event) => onDownloadPDF(invoice.id, event)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                          title="Baixar PDF"
                          disabled={downloading === invoice.id}
                        >
                          <Download
                            className={`h-4 w-4 ${
                              downloading === invoice.id ? "animate-pulse" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={(event) => onSendEmail(invoice.id, event)}
                          className="text-brand-primary hover:text-brand-primary/80 disabled:opacity-50"
                          title="Enviar por email"
                          disabled={sending === invoice.id || invoice.status === "CANCELLED"}
                        >
                          <Send
                            className={`h-4 w-4 ${
                              sending === invoice.id ? "animate-pulse" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CardContent className="flex items-center justify-between border-t border-border px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Mostrando{" "}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              até{" "}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              de <span className="font-medium">{pagination.total}</span> invoices
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Próxima
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
