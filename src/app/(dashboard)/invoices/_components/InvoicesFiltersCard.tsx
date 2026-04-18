import { Filter, Search } from "lucide-react";

import { Button } from "@gladpros/ui/button"
import { Card, CardContent } from "@gladpros/ui/card";

import type { InvoiceListFilters } from "./types";

type InvoicesFiltersCardProps = {
  filters: InvoiceListFilters;
  showFilters: boolean;
  onFiltersChange: (next: InvoiceListFilters) => void;
  onToggleFilters: () => void;
  onCreateInvoice: () => void;
};

export function InvoicesFiltersCard({
  filters,
  showFilters,
  onFiltersChange,
  onToggleFilters,
  onCreateInvoice,
}: InvoicesFiltersCardProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por número, cliente ou projeto..."
              value={filters.search}
              onChange={(event) =>
                onFiltersChange({ ...filters, search: event.target.value, })
              }
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <select
            title="Filtrar por status da invoice"
            value={filters.status}
            onChange={(event) =>
              onFiltersChange({ ...filters, status: event.target.value })
            }
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SENT">Enviada</option>
            <option value="VIEWED">Visualizada</option>
            <option value="PARTIAL_PAID">Parcialmente Paga</option>
            <option value="PAID">Paga</option>
            <option value="OVERDUE">Vencida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>

          <Button variant="outline" size="default" onClick={onToggleFilters}>
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Data Início
              </label>
              <input
                type="date"
                title="Data início do filtro"
                value={filters.dataInicio}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dataInicio: event.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Data Fim
              </label>
              <input
                type="date"
                title="Data fim do filtro"
                value={filters.dataFim}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dataFim: event.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={onCreateInvoice} size="default">
            Nova Invoice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
