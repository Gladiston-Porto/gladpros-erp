import { Badge } from "@gladpros/ui/badge";
import { Mail, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

import {
  formatInvoiceCurrency,
  formatInvoiceDate,
  getInvoiceStatusBadgeVariant,
  getInvoiceStatusIcon,
  getInvoiceStatusLabel,
} from "./invoice-utils";
import type { InvoiceDetail } from "./types";

type InvoiceDetailHeaderProps = {
  invoice: InvoiceDetail;
  invoiceId: string;
  onBack: () => void;
  onSendInvoice: () => void;
  onOpenPaymentDialog: () => void;
  onOpenPdf: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function InvoiceDetailHeader({
  invoice,
  invoiceId,
  onBack,
  onSendInvoice,
  onOpenPaymentDialog,
  onOpenPdf,
  onPrint,
  onEdit,
  onDelete,
}: InvoiceDetailHeaderProps) {
  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        Voltar para lista
      </button>

      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{invoice.numeroInvoice}</h1>
            <Badge
              variant={getInvoiceStatusBadgeVariant(invoice.status)}
              className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium"
            >
              {getInvoiceStatusIcon(invoice.status)}
              {getInvoiceStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Criada em {formatInvoiceDate(invoice.criadoEm)} por {invoice.criador.nome}
          </p>
        </div>

        <div className="flex gap-2">
          {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <>
              <button
                onClick={onSendInvoice}
                className="rounded-xl bg-brand-primary px-4 py-2 text-white transition-colors hover:bg-brand-primary/90"
              >
                Enviar
              </button>
              <button
                onClick={onOpenPaymentDialog}
                disabled={Number(invoice.saldo) <= 0}
                className="rounded-xl bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Registrar Pagamento
              </button>
            </>
          )}
          <button
            onClick={onOpenPdf}
            className="rounded-xl border border-border px-4 py-2 transition-colors hover:bg-muted/50"
          >
            PDF
          </button>
          <button
            onClick={onPrint}
            className="rounded-xl border border-border px-4 py-2 transition-colors hover:bg-muted/50"
          >
            Imprimir
          </button>
          {["DRAFT", "SENT"].includes(invoice.status) && (
            <>
              <button
                onClick={onEdit}
                className="rounded-xl border border-border px-4 py-2 transition-colors hover:bg-muted/50"
              >
                Editar
              </button>
              <button
                onClick={onDelete}
                className="rounded-xl border border-destructive/40 px-4 py-2 text-destructive transition-colors hover:bg-destructive/10"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type InvoiceDetailContentProps = {
  invoice: InvoiceDetail;
  financialTotals: {
    subtotal: number;
    descontoValor: number;
    descontoPercentual: number;
    taxRate: number;
    taxAmount: number;
    taxableAmount?: number | null;
    nonTaxableAmount?: number | null;
    taxMode?: string | null;
    taxScenario?: string | null;
    taxExplanation?: string | null;
    valorTotal: number;
    valorPago: number;
    saldo: number;
  };
};

export function InvoiceDetailContent({
  invoice,
  financialTotals,
}: InvoiceDetailContentProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Informações do Cliente
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Cliente</div>
              <div className="font-medium text-foreground">{invoice.cliente.nome}</div>
              <div className="text-sm text-muted-foreground">{invoice.cliente.email}</div>
              {invoice.cliente.telefone && (
                <div className="text-sm text-muted-foreground">{invoice.cliente.telefone}</div>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Projeto</div>
              <div className="font-medium text-foreground">
                {invoice.projeto?.nome || "Nenhum projeto"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Itens ({invoice.itens.length})
          </h2>
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Descrição
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Qtd
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Preço Unit.
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium text-foreground">{item.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.tipo} • {item.taxavel ? "Taxável" : "Não taxável"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-foreground">
                    {item.quantidade} {item.unidade}
                  </td>
                  <td className="px-4 py-4 text-right text-foreground">
                    {formatInvoiceCurrency(Number(item.precoUnitario))}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-foreground">
                    {formatInvoiceCurrency(Number(item.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 space-y-2 border-t border-border pt-6">
            <div className="flex justify-between text-foreground/80">
              <span>Subtotal</span>
              <span className="font-medium">
                {formatInvoiceCurrency(financialTotals.subtotal)}
              </span>
            </div>
            {financialTotals.descontoValor > 0 && (
              <div className="flex justify-between text-foreground/80">
                <span>
                  Desconto
                  {financialTotals.descontoPercentual > 0 &&
                    ` (${financialTotals.descontoPercentual}%)`}
                </span>
                <span className="font-medium text-destructive">
                  -{formatInvoiceCurrency(financialTotals.descontoValor)}
                </span>
              </div>
            )}
            {financialTotals.taxMode === "NON_TAXABLE" ? (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Sales Tax</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                  Non-Taxable
                </span>
              </div>
            ) : financialTotals.taxMode === "MANUAL_REVIEW" ? (
              <div className="flex justify-between text-sm text-yellow-600">
                <span>Sales Tax</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium">
                  ⚠ Pending Review
                </span>
              </div>
            ) : financialTotals.taxAmount > 0 ? (
              <div className="flex justify-between text-foreground/80">
                <span>Sales Tax ({(financialTotals.taxRate * 100).toFixed(2)}%)</span>
                <span className="font-medium">
                  {formatInvoiceCurrency(financialTotals.taxAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold text-foreground">
              <span>Total</span>
              <span>{formatInvoiceCurrency(financialTotals.valorTotal)}</span>
            </div>
          </div>
        </div>

        {invoice.pagamentos.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Histórico de Pagamentos ({invoice.pagamentos.length})
            </h2>
            <div className="space-y-3">
              {invoice.pagamentos.map((pagamento) => (
                <div
                  key={pagamento.id}
                  className="flex items-start justify-between rounded-xl bg-muted/50 p-4"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {formatInvoiceCurrency(Number(pagamento.valor))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatInvoiceDate(pagamento.dataPagamento)} • {pagamento.metodoPagamento}
                    </div>
                    {pagamento.referencia && (
                      <div className="text-xs text-muted-foreground">
                        Ref: {pagamento.referencia}
                      </div>
                    )}
                    {pagamento.notas && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {pagamento.notas}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    por {pagamento.criador.nome}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <InvoiceSendHistory lembretes={invoice.lembretes} />

        {(invoice.notas || invoice.termos) && (          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {invoice.notas && (
              <div className="mb-4">
                <h3 className="mb-2 font-medium text-foreground">Notas</h3>
                <p className="whitespace-pre-wrap text-foreground/80">{invoice.notas}</p>
              </div>
            )}
            {invoice.termos && (
              <div>
                <h3 className="mb-2 font-medium text-foreground">Termos e Condições</h3>
                <p className="whitespace-pre-wrap text-foreground/80">{invoice.termos}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Status Financeiro</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-2xl font-bold text-foreground">
                {formatInvoiceCurrency(financialTotals.valorTotal)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Valor Pago</div>
              <div className="text-xl font-semibold text-green-600">
                {formatInvoiceCurrency(financialTotals.valorPago)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Saldo Restante</div>
              <div
                className={`text-xl font-semibold ${
                  financialTotals.saldo > 0 ? "text-destructive" : "text-green-600"
                }`}
              >
                {formatInvoiceCurrency(financialTotals.saldo)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-foreground">Datas</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Emissão</div>
              <div className="font-medium text-foreground">
                {formatInvoiceDate(invoice.dataEmissao)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Vencimento</div>
              <div className="font-medium text-foreground">
                {formatInvoiceDate(invoice.dataVencimento)}
              </div>
            </div>
            {invoice.dataPagamento && (
              <div>
                <div className="text-sm text-muted-foreground">Pagamento</div>
                <div className="font-medium text-green-600">
                  {formatInvoiceDate(invoice.dataPagamento)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax Classification Card */}
        {invoice.taxMode && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Sales Tax</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                {invoice.taxMode === "NON_TAXABLE" && (
                  <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                    Non-Taxable
                  </span>
                )}
                {invoice.taxMode === "MANUAL_REVIEW" && !invoice.manualTaxOverride && (
                  <span className="inline-flex rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">
                    ⚠ Pending Review
                  </span>
                )}
                {invoice.taxMode === "MANUAL_REVIEW" && invoice.manualTaxOverride && (
                  <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
                    Reviewed / Override
                  </span>
                )}
                {(invoice.taxMode === "TAX_EXCLUDED" || invoice.taxMode === "TAX_INCLUDED") && (
                  <span className="inline-flex rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
                    Taxable
                  </span>
                )}
              </div>

              {invoice.taxScenario && (
                <div>
                  <div className="text-xs text-muted-foreground">Scenario</div>
                  <div className="text-sm font-medium text-foreground">{invoice.taxScenario}</div>
                </div>
              )}

              {invoice.taxExplanation && (
                <div>
                  <div className="text-xs text-muted-foreground">Rule Applied</div>
                  <div className="text-xs text-foreground/70">{invoice.taxExplanation}</div>
                </div>
              )}

              {(invoice.taxAddressCity || invoice.taxAddressState) && (
                <div>
                  <div className="text-xs text-muted-foreground">Jurisdiction</div>
                  <div className="text-sm text-foreground">
                    {[invoice.taxAddressCity, invoice.taxAddressState].filter(Boolean).join(", ")}
                  </div>
                </div>
              )}

              {invoice.manualTaxOverride && invoice.manualTaxOverrideReason && (
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <div className="text-xs font-medium text-blue-600">Override Reason</div>
                  <div className="text-xs text-foreground/70">{invoice.manualTaxOverrideReason}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Send History ──────────────────────────────────────────────────────────────

type ReminderTipo = "INITIAL_SEND" | "REMINDER" | "OVERDUE_NOTICE" | "RECEIPT" | string;
type ReminderStatus = "SENT" | "FAILED" | "PENDING" | string;

function getReminderTipoLabel(tipo: ReminderTipo): string {
  const labels: Record<string, string> = {
    INITIAL_SEND: "Invoice Sent",
    REMINDER: "Payment Reminder",
    OVERDUE_NOTICE: "Overdue Notice",
    RECEIPT: "Payment Receipt",
  };
  return labels[tipo] ?? tipo;
}

function getReminderStatusIcon(status: ReminderStatus) {
  if (status === "SENT")
    return <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden />;
  if (status === "FAILED")
    return <XCircle className="h-4 w-4 text-destructive" aria-hidden />;
  return <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

function getReminderStatusBadge(status: ReminderStatus) {
  if (status === "SENT")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Delivered
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

export function InvoiceSendHistory({ lembretes }: { lembretes: InvoiceDetail["lembretes"] }) {
  if (!lembretes || lembretes.length === 0) return null;

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(d));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-5 w-5 text-brand-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">
          Email Send History ({lembretes.length})
        </h2>
      </div>

      <div className="space-y-3">
        {lembretes.map((lembrete) => (
          <div
            key={lembrete.id}
            className="flex items-start justify-between rounded-xl bg-muted/50 p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {getReminderStatusIcon(lembrete.status)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {getReminderTipoLabel(lembrete.tipo)}
                  </span>
                  {getReminderStatusBadge(lembrete.status)}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  To: {lembrete.destinatario}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground/70">
                  {lembrete.assunto}
                </div>
                {lembrete.erro && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {lembrete.erro}
                  </div>
                )}
                {lembrete.diasAposVencimento != null && lembrete.diasAposVencimento > 0 && (
                  <div className="mt-0.5 text-xs text-yellow-600">
                    {lembrete.diasAposVencimento} day{lembrete.diasAposVencimento !== 1 ? "s" : ""} past due
                  </div>
                )}
              </div>
            </div>
            <div className="ml-4 shrink-0 text-right text-xs text-muted-foreground">
              {fmtDate(lembrete.dataEnvio)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
