"use client";

import { useState } from "react";
import { Check, Package, Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";

import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

import type { PlannedMaterial, StockMaterial } from "./types";

type ServiceOrderMaterialsSectionProps = {
  materialSearch: string;
  pendingMaterial: StockMaterial | null;
  pendingQty: string;
  plannedMaterials: PlannedMaterial[];
  showMaterialSearch: boolean;
  stockMaterials: StockMaterial[];
  setMaterialSearch: React.Dispatch<React.SetStateAction<string>>;
  setPendingMaterial: React.Dispatch<React.SetStateAction<StockMaterial | null>>;
  setPendingQty: React.Dispatch<React.SetStateAction<string>>;
  setPlannedMaterials: React.Dispatch<React.SetStateAction<PlannedMaterial[]>>;
  setShowMaterialSearch: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenMaterialSearch: () => void;
};

export function ServiceOrderMaterialsSection({
  materialSearch,
  pendingMaterial,
  pendingQty,
  plannedMaterials,
  showMaterialSearch,
  stockMaterials,
  setMaterialSearch,
  setPendingMaterial,
  setPendingQty,
  setPlannedMaterials,
  setShowMaterialSearch,
  onOpenMaterialSearch,
}: ServiceOrderMaterialsSectionProps) {
  // External material form state
  const [addMode, setAddMode] = useState<"stock" | "external" | null>(null);
  const [extForm, setExtForm] = useState({ name: "", unit: "un", qty: "1", cost: "" });

  // Edit inline state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", unit: "un", qty: "1", cost: "" });

  const startEdit = (index: number) => {
    const m = plannedMaterials[index];
    setEditingIndex(index);
    setEditForm({
      name: m.name,
      unit: m.unit ?? "un",
      qty: String(m.quantityPlanned),
      cost: m.unitCostEstimated > 0 ? String(m.unitCostEstimated) : "",
    });
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    if (!editForm.name.trim() || parseFloat(editForm.qty) <= 0) return;
    setPlannedMaterials((current) =>
      current.map((m, i) =>
        i === editingIndex
          ? {
              ...m,
              name: editForm.name.trim(),
              unit: editForm.unit.trim() || "un",
              quantityPlanned: parseFloat(editForm.qty) || 1,
              unitCostEstimated: parseFloat(editForm.cost) || 0,
            }
          : m
      )
    );
    setEditingIndex(null);
  };

  const cancelEdit = () => setEditingIndex(null);

  const filteredMaterials = stockMaterials
    .filter((material) =>
      material.nome.toLowerCase().includes(materialSearch.toLowerCase())
    )
    .slice(0, 8);

  const addPendingMaterial = () => {
    if (!pendingMaterial || parseFloat(pendingQty) <= 0) return;
    setPlannedMaterials((current) => [
      ...current,
      {
        materialId: pendingMaterial.id,
        name: pendingMaterial.nome,
        unit: pendingMaterial.unidade,
        quantityPlanned: parseFloat(pendingQty),
        unitCostEstimated: pendingMaterial.precoUnitario,
        stockQty: pendingMaterial.quantidadeEstoque,
      },
    ]);
    setPendingMaterial(null);
    setPendingQty("1");
    setMaterialSearch("");
  };

  const addExternalMaterial = () => {
    if (!extForm.name.trim() || parseFloat(extForm.qty) <= 0) return;
    setPlannedMaterials((current) => [
      ...current,
      {
        materialId: undefined,
        name: extForm.name.trim(),
        unit: extForm.unit.trim() || "un",
        quantityPlanned: parseFloat(extForm.qty) || 1,
        unitCostEstimated: parseFloat(extForm.cost) || 0,
        stockQty: 0,
      },
    ]);
    setExtForm({ name: "", unit: "un", qty: "1", cost: "" });
    setAddMode(null);
  };

  const closePanel = () => {
    setAddMode(null);
    setShowMaterialSearch(false);
    setMaterialSearch("");
    setPendingMaterial(null);
    setExtForm({ name: "", unit: "un", qty: "1", cost: "" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Materiais Planejados ({plannedMaterials.length})</CardTitle>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Material do estoque"
            onClick={() => {
              setAddMode("stock");
              setShowMaterialSearch(true);
              onOpenMaterialSearch();
            }}
          >
            <Package className="mr-1 h-4 w-4" />
            Estoque
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Compra externa / campo"
            onClick={() => {
              setAddMode("external");
              setShowMaterialSearch(false);
            }}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            Compra
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {plannedMaterials.length === 0 && !showMaterialSearch && addMode !== "external" && (
          <p className="py-4 text-center text-muted-foreground">
            Nenhum material adicionado. Use <strong>Estoque</strong> para vincular ao inventário ou <strong>Compra</strong> para registrar uma compra de campo.
          </p>
        )}

        {plannedMaterials.length > 0 && (
          <div className="mb-4 space-y-2">
            {plannedMaterials.map((material, index) => (
              <div
                key={`${material.materialId ?? 'ext'}-${index}`}
                className="rounded-lg border border-border p-3"
              >
                {editingIndex === index ? (
                  /* ── Inline edit form ── */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Nome *</label>
                        <input
                          type="text"
                          autoFocus
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }}
                          disabled={material.materialId !== undefined}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Unidade</label>
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Quantidade *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editForm.qty}
                          onChange={(e) => setEditForm((f) => ({ ...f, qty: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Custo unitário estimado ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.cost}
                          onChange={(e) => setEditForm((f) => ({ ...f, cost: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" aria-label="Cancelar edição" onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                      <button type="button" aria-label="Salvar edição" onClick={saveEdit} className="text-green-600 hover:text-green-700">
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal row ── */
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{material.name}</span>
                        {material.materialId === undefined && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Campo</span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {material.quantityPlanned} {material.unit}
                        {material.unitCostEstimated > 0 && ` · $${material.unitCostEstimated.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {material.materialId !== undefined ? (
                        material.quantityPlanned > material.stockQty ? (
                          <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Comprar ({material.stockQty} em estoque)
                          </span>
                        ) : (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Em estoque ({material.stockQty})
                          </span>
                        )
                      ) : null}
                      <button
                        type="button"
                        aria-label="Editar material"
                        onClick={() => startEdit(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Remover material"
                        onClick={() =>
                          setPlannedMaterials((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 text-sm text-muted-foreground">
              <span>
                {plannedMaterials.filter((m) => m.materialId !== undefined && m.quantityPlanned > m.stockQty).length} precisam compra
                {" · "}
                {plannedMaterials.filter((m) => m.materialId === undefined).length} compra de campo
              </span>
              <span>
                Est. $
                {plannedMaterials
                  .reduce((sum, m) => sum + m.quantityPlanned * m.unitCostEstimated, 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* External purchase form */}
        {addMode === "external" && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Material de Compra / Campo
              </span>
              <button type="button" aria-label="Fechar" onClick={closePanel} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Nome do material *</label>
                <input
                  type="text"
                  autoFocus
                  value={extForm.name}
                  onChange={(e) => setExtForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExternalMaterial())}
                  placeholder="Ex: 90° Street Elbow ¾in"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Unidade</label>
                <input
                  type="text"
                  value={extForm.unit}
                  onChange={(e) => setExtForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="un"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Quantidade *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={extForm.qty}
                  onChange={(e) => setExtForm((f) => ({ ...f, qty: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Custo unitário estimado ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extForm.cost}
                  onChange={(e) => setExtForm((f) => ({ ...f, cost: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closePanel}>Cancelar</Button>
              <Button type="button" size="sm" onClick={addExternalMaterial} disabled={!extForm.name.trim()}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {/* Stock search panel */}
        {showMaterialSearch && addMode === "stock" && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Selecionar do Estoque
              </span>
              <button type="button" aria-label="Fechar painel de materiais" onClick={closePanel} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder="Buscar material no estoque..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />

            {pendingMaterial && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                <span className="flex-1 text-sm font-medium text-foreground">
                  {pendingMaterial.nome}
                </span>
                <input
                  type="number"
                  value={pendingQty}
                  onChange={(event) => setPendingQty(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") { event.preventDefault(); addPendingMaterial(); }
                  }}
                  min="0.01"
                  step="0.01"
                  aria-label="Quantidade"
                  placeholder="1"
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">{pendingMaterial.unidade}</span>
                <Button type="button" size="sm" onClick={addPendingMaterial}>Adicionar</Button>
                <button type="button" aria-label="Cancelar" onClick={() => { setPendingMaterial(null); setPendingQty("1"); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background">
              {filteredMaterials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => { setPendingMaterial(material); setPendingQty("1"); }}
                  className="w-full border-b border-border px-3 py-2 text-left text-foreground hover:bg-accent hover:text-accent-foreground last:border-b-0"
                >
                  <div className="flex justify-between">
                    <span className="text-sm">{material.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      Estoque: {material.quantidadeEstoque} {material.unidade}
                    </span>
                  </div>
                </button>
              ))}
              {filteredMaterials.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {stockMaterials.length === 0 ? "Carregando estoque..." : "Nenhum material encontrado no estoque"}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Material não está no estoque?{" "}
              <button type="button" className="text-primary underline" onClick={() => { closePanel(); setAddMode("external"); }}>
                Adicionar como compra de campo
              </button>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
