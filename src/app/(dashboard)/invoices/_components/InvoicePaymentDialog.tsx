import type { InvoicePaymentData } from "./types";

type InvoicePaymentDialogProps = {
  open: boolean;
  paymentData: InvoicePaymentData;
  processingPayment: boolean;
  maxAmount: number;
  onClose: () => void;
  onChange: (next: InvoicePaymentData) => void;
  onSubmit: () => void;
  formatCurrency: (value: number) => string;
};

export default function InvoicePaymentDialog({
  open,
  paymentData,
  processingPayment,
  maxAmount,
  onClose,
  onChange,
  onSubmit,
  formatCurrency,
}: InvoicePaymentDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">Registrar Pagamento</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Valor do Pagamento *
            </label>
            <input
              type="number"
              value={paymentData.valor}
              onChange={(event) => onChange({ ...paymentData, valor: event.target.value })}
              step="0.01"
              min="0"
              max={maxAmount}
              className="w-full rounded-xl border border-border bg-background px-4 py-2 focus:ring-2 focus:ring-primary"
              required
            />
            <div className="mt-1 text-xs text-muted-foreground">
              Saldo disponível: {formatCurrency(maxAmount)}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Data do Pagamento *
            </label>
            <input
              type="date"
              value={paymentData.dataPagamento}
              onChange={(event) =>
                onChange({ ...paymentData, dataPagamento: event.target.value })
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-2 focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Método de Pagamento *
            </label>
            <select
              value={paymentData.metodoPagamento}
              onChange={(event) =>
                onChange({ ...paymentData, metodoPagamento: event.target.value })
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-2 focus:ring-2 focus:ring-primary"
            >
              <option value="BANK_TRANSFER">Transferência Bancária</option>
              <option value="CHECK">Cheque</option>
              <option value="CARD">Cartão</option>
              <option value="CASH">Dinheiro</option>
              <option value="STRIPE">Stripe</option>
              <option value="SQUARE">Square</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Referência (opcional)
            </label>
            <input
              type="text"
              value={paymentData.referencia}
              onChange={(event) =>
                onChange({ ...paymentData, referencia: event.target.value })
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-2 focus:ring-2 focus:ring-primary"
              placeholder="Número do cheque, ID da transação..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Notas (opcional)
            </label>
            <textarea
              value={paymentData.notas}
              onChange={(event) => onChange({ ...paymentData, notas: event.target.value })}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-4 py-2 focus:ring-2 focus:ring-primary"
              placeholder="Observações sobre este pagamento..."
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2 transition-colors hover:bg-muted/50"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={processingPayment || !paymentData.valor}
            className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processingPayment ? "Processando..." : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
