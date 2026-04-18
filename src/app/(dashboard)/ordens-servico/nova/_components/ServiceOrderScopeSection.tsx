"use client";

import { CheckCircle2, Plus, Trash2 } from "lucide-react";

import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

import type { ServiceOrderFormState } from "./types";

type ServiceOrderScopeSectionProps = {
  form: ServiceOrderFormState;
  inputCls: string;
  labelCls: string;
  newScopeItem: string;
  scopeItems: string[];
  setForm: React.Dispatch<React.SetStateAction<ServiceOrderFormState>>;
  setNewScopeItem: React.Dispatch<React.SetStateAction<string>>;
  setScopeItems: React.Dispatch<React.SetStateAction<string[]>>;
};

export function ServiceOrderScopeSection({
  form,
  inputCls,
  labelCls,
  newScopeItem,
  scopeItems,
  setForm,
  setNewScopeItem,
  setScopeItems,
}: ServiceOrderScopeSectionProps) {
  const addScopeItem = () => {
    if (!newScopeItem.trim()) {
      return;
    }
    setScopeItems((current) => [...current, newScopeItem.trim()]);
    setNewScopeItem("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escopo do Serviço</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className={labelCls}>Descrição Geral</label>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            className={`${inputCls} h-24 resize-y`}
            placeholder="Contexto e observações sobre o serviço..."
          />
        </div>

        <div>
          <label className={labelCls}>Checklist de Tarefas</label>
          <div className="mt-2 space-y-2">
            {scopeItems.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground">{item}</span>
                <button
                  type="button"
                  aria-label="Remover tarefa"
                  onClick={() =>
                    setScopeItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newScopeItem}
                onChange={(event) => setNewScopeItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addScopeItem();
                  }
                }}
                placeholder="Adicionar tarefa ao checklist..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="button" variant="outline" size="sm" onClick={addScopeItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Horas Estimadas</label>
            <input
              type="number"
              step="0.5"
              value={form.estimatedHours}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  estimatedHours: event.target.value,
                }))
              }
              className={inputCls}
              placeholder="4"
            />
          </div>
          <div>
            <label className={labelCls}>Taxa Horária ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.hourlyRate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  hourlyRate: event.target.value,
                }))
              }
              className={inputCls}
              placeholder="75.00"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Materiais</label>
          <select
            title="Fornecimento de materiais"
            value={form.materialSupply}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                materialSupply: event.target.value as
                  | "CLIENT_PROVIDES"
                  | "COMPANY_PROVIDES",
              }))
            }
            className={inputCls}
          >
            <option value="COMPANY_PROVIDES">Empresa fornece</option>
            <option value="CLIENT_PROVIDES">Cliente fornece</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
