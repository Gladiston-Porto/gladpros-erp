import { Badge } from "@gladpros/ui/badge";

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
            <div className="flex justify-between text-foreground/80">
              <span>Taxa ({(financialTotals.taxRate * 100).toFixed(2)}%)</span>
              <span className="font-medium">
                {formatInvoiceCurrency(financialTotals.taxAmount)}
              </span>
            </div>
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

        {(invoice.notas || invoice.termos) && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
      </div>
    </div>
  );
}
