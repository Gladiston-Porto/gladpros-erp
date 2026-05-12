import { Plus, Trash2 } from "lucide-react";

import { formatInvoiceCurrency } from "./invoice-utils";
import type {
  InvoiceClientOption,
  InvoiceFormData,
  InvoiceFormItem,
  InvoiceProjectOption,
} from "./types";

type BasicsStepProps = {
  bootstrapLoading: boolean;
  formData: InvoiceFormData;
  clientes: InvoiceClientOption[];
  filteredProjetos: InvoiceProjectOption[];
  onChange: (next: InvoiceFormData) => void;
};

export function InvoiceBasicsStep({
  bootstrapLoading,
  formData,
  clientes,
  filteredProjetos,
  onChange,
}: BasicsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Cliente *</label>
        <select
          value={formData.clienteId}
          onChange={(event) =>
            onChange({ ...formData, clienteId: event.target.value, projetoId: "" })
          }
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          required
          aria-label="Cliente"
          disabled={bootstrapLoading}
        >
          <option value="">
            {bootstrapLoading ? "Carregando clientes..." : "Selecione um cliente"}
          </option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome} ({cliente.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Projeto (opcional)
        </label>
        <select
          value={formData.projetoId}
          onChange={(event) => onChange({ ...formData, projetoId: event.target.value })}
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          disabled={!formData.clienteId || bootstrapLoading}
          aria-label="Projeto"
        >
          <option value="">
            {bootstrapLoading ? "Carregando projetos..." : "Nenhum projeto"}
          </option>
          {filteredProjetos.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Data de Vencimento *
        </label>
        <input
          type="date"
          value={formData.dataVencimento}
          onChange={(event) => onChange({ ...formData, dataVencimento: event.target.value })}
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          required
          aria-label="Data de Vencimento"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Notas (opcional)
        </label>
        <textarea
          value={formData.notas}
          onChange={(event) => onChange({ ...formData, notas: event.target.value })}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          placeholder="Notas internas sobre esta invoice..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Termos e Condições (opcional)
        </label>
        <textarea
          value={formData.termos}
          onChange={(event) => onChange({ ...formData, termos: event.target.value })}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          placeholder="Termos de pagamento, garantias, etc..."
        />
      </div>
    </div>
  );
}

type ItemsStepProps = {
  itens: InvoiceFormItem[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateItem: (index: number, field: keyof InvoiceFormItem, value: any) => void;
  onCalculateSubtotal: (item: InvoiceFormItem) => number;
};

export function InvoiceItemsStep({
  itens,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onCalculateSubtotal,
}: ItemsStepProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Itens da Invoice</h3>
        <button
          onClick={onAddItem}
          className="flex items-center gap-2 font-medium text-brand-primary hover:text-brand-primary/80"
        >
          <Plus className="h-4 w-4" />
          Adicionar Item
        </button>
      </div>

      <div className="space-y-4">
        {itens.map((item, index) => (
          <div key={index} className="space-y-4 rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-foreground">Item {index + 1}</h4>
              {itens.length > 1 && (
                <button
                  onClick={() => onRemoveItem(index)}
                  className="text-destructive hover:text-destructive/80"
                  aria-label={`Remover item ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Tipo</label>
                <select
                  value={item.tipo}
                  onChange={(event) => onUpdateItem(index, "tipo", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  aria-label={`Tipo do item ${index + 1}`}
                >
                  <option value="SERVICE">Serviço</option>
                  <option value="MATERIAL">Material</option>
                  <option value="EQUIPMENT">Equipamento</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Unidade
                </label>
                <input
                  type="text"
                  value={item.unidade}
                  onChange={(event) => onUpdateItem(index, "unidade", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  placeholder="hour, unit, sq ft..."
                  aria-label={`Unidade do item ${index + 1}`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Descrição *
              </label>
              <textarea
                value={item.descricao}
                onChange={(event) => onUpdateItem(index, "descricao", event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                placeholder="Descreva o item..."
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={item.quantidade}
                  onChange={(event) =>
                    onUpdateItem(index, "quantidade", parseFloat(event.target.value) || 0)
                  }
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  aria-label={`Quantidade do item ${index + 1}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Preço Unit.
                </label>
                <input
                  type="number"
                  value={item.precoUnitario}
                  onChange={(event) =>
                    onUpdateItem(index, "precoUnitario", parseFloat(event.target.value) || 0)
                  }
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  aria-label={`Preço unitário do item ${index + 1}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Desconto
                </label>
                <input
                  type="number"
                  value={item.desconto}
                  onChange={(event) =>
                    onUpdateItem(index, "desconto", parseFloat(event.target.value) || 0)
                  }
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  aria-label={`Desconto do item ${index + 1}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Subtotal
                </label>
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 font-medium text-foreground">
                  {formatInvoiceCurrency(onCalculateSubtotal(item))}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                aria-label="Aplicar taxa de imposto (8.25%)"
                checked={item.taxavel}
                onChange={(event) => onUpdateItem(index, "taxavel", event.target.checked)}
                className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
              />
              <label className="ml-2 text-sm text-muted-foreground">
                Aplicar taxa de imposto (8.25%)
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ReviewStepProps = {
  formData: InvoiceFormData;
  itens: InvoiceFormItem[];
  descontoValor: number;
  descontoPercentual: number;
  selectedCliente?: InvoiceClientOption;
  selectedProjeto?: InvoiceProjectOption;
  totals: {
    subtotal: number;
    desconto: number;
    subtotalComDesconto: number;
    taxAmount: number;
    total: number;
  };
  onCalculateSubtotal: (item: InvoiceFormItem) => number;
  onDiscountValueChange: (value: number) => void;
  onDiscountPercentChange: (value: number) => void;
};

export function InvoiceReviewStep({
  formData,
  itens,
  descontoValor,
  descontoPercentual,
  selectedCliente,
  selectedProjeto,
  totals,
  onCalculateSubtotal,
  onDiscountValueChange,
  onDiscountPercentChange,
}: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Resumo da Invoice</h3>

        <div className="mb-6 rounded-2xl bg-muted/40 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Cliente</div>
              <div className="font-medium text-foreground">{selectedCliente?.nome}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Projeto</div>
              <div className="font-medium text-foreground">
                {formData.projetoId ? selectedProjeto?.nome : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Data de Vencimento</div>
              <div className="font-medium text-foreground">
                {new Date(formData.dataVencimento).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="mb-3 font-medium text-foreground">Itens ({itens.length})</h4>
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  Descrição
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Qtd
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Preço Unit.
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={index} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.tipo} • {item.taxavel ? "Taxável" : "Não taxável"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {item.quantidade} {item.unidade}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatInvoiceCurrency(item.precoUnitario)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatInvoiceCurrency(onCalculateSubtotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6 space-y-4">
          <h4 className="font-medium text-foreground">Descontos (opcional)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Desconto em Valor ($)
              </label>
              <input
                type="number"
                value={descontoValor}
                onChange={(event) => onDiscountValueChange(parseFloat(event.target.value) || 0)}
                step="0.01"
                min="0"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                aria-label="Desconto em valor"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Desconto em % (0-100)
              </label>
              <input
                type="number"
                value={descontoPercentual}
                onChange={(event) =>
                  onDiscountPercentChange(parseFloat(event.target.value) || 0)
                }
                step="0.01"
                min="0"
                max="100"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                aria-label="Desconto em percentual"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-brand-primary/10 p-6">
          <div className="flex justify-between text-foreground/80">
            <span>Subtotal</span>
            <span className="font-medium">{formatInvoiceCurrency(totals.subtotal)}</span>
          </div>
          {totals.desconto > 0 && (
            <div className="flex justify-between text-foreground/80">
              <span>
                Desconto
                {descontoPercentual > 0 && ` (${descontoPercentual}%)`}
              </span>
              <span className="font-medium text-destructive">
                -{formatInvoiceCurrency(totals.desconto)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-foreground/80">
            <span>Taxa (8.25%)</span>
            <span className="font-medium">{formatInvoiceCurrency(totals.taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-brand-primary/20 pt-3 text-lg font-bold text-foreground">
            <span>Total</span>
            <span>{formatInvoiceCurrency(totals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
