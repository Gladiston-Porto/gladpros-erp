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

  // Embalagem selection for pending (stock) material
  const [pendingEmbTipo, setPendingEmbTipo] = useState<"unidade" | "embalagem">("unidade");
  const [pendingEmbId, setPendingEmbId] = useState<number | null>(null);
  const [pendingEmbQty, setPendingEmbQty] = useState(1);
  // Manual embalagem fields (when no pre-registered options)
  const [pendingEmbBaseQty, setPendingEmbBaseQty] = useState<number | null>(null);
  const [pendingEmbPkgPrice, setPendingEmbPkgPrice] = useState<number | null>(null);
  const [pendingEmbPkgType, setPendingEmbPkgType] = useState("");

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

    const embalagemFields: Partial<PlannedMaterial> = {};
    if (pendingEmbTipo === "embalagem") {
      if (pendingEmbId) {
        const emb = pendingMaterial.embalagens?.find((e) => e.id === pendingEmbId);
        if (emb) {
          embalagemFields.embalagemId = emb.id;
          embalagemFields.qtdEmbalagens = pendingEmbQty;
          embalagemFields.embalagemBaseQtyAtTime = emb.baseQtyPerUnit;
          embalagemFields.embalagemPrecoAtTime = emb.precoCompra;
          embalagemFields.embalagemUnitAtTime = emb.packageType;
        }
      } else if (pendingEmbBaseQty) {
        embalagemFields.qtdEmbalagens = pendingEmbQty;
        embalagemFields.embalagemBaseQtyAtTime = pendingEmbBaseQty;
        embalagemFields.embalagemPrecoAtTime = pendingEmbPkgPrice;
        embalagemFields.embalagemUnitAtTime = pendingEmbPkgType || null;
      }
    }

    setPlannedMaterials((current) => [
      ...current,
      {
        materialId: pendingMaterial.id,
        name: pendingMaterial.nome,
        unit: pendingMaterial.unidade,
        quantityPlanned: parseFloat(pendingQty),
        unitCostEstimated: pendingMaterial.precoUnitario,
        stockQty: pendingMaterial.quantidadeEstoque,
        ...embalagemFields,
      },
    ]);
    setPendingMaterial(null);
    setPendingQty("1");
    setPendingEmbTipo("unidade");
    setPendingEmbId(null);
    setPendingEmbQty(1);
    setPendingEmbBaseQty(null);
    setPendingEmbPkgPrice(null);
    setPendingEmbPkgType("");
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
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                {/* Material name + cancel */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{pendingMaterial.nome}</span>
                  <button type="button" aria-label="Cancelar" onClick={() => { setPendingMaterial(null); setPendingQty("1"); setPendingEmbTipo("unidade"); setPendingEmbId(null); setPendingEmbQty(1); setPendingEmbBaseQty(null); setPendingEmbPkgPrice(null); setPendingEmbPkgType(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Embalagem toggle — shown for all selected materials */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingEmbTipo("unidade");
                      setPendingEmbId(null);
                      setPendingEmbQty(1);
                      setPendingEmbBaseQty(null);
                      setPendingEmbPkgPrice(null);
                      setPendingEmbPkgType("");
                      setPendingQty("1");
                    }}
                    className={`flex-1 px-2 py-1.5 transition-colors ${pendingEmbTipo === "unidade" ? "bg-brand-primary text-white font-medium" : "bg-background text-muted-foreground hover:bg-muted/30"}`}
                  >
                    Por Unidade
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingEmbTipo("embalagem")}
                    className={`flex-1 px-2 py-1.5 flex items-center justify-center gap-1 transition-colors ${pendingEmbTipo === "embalagem" ? "bg-brand-primary text-white font-medium" : "bg-background text-muted-foreground hover:bg-muted/30"}`}
                  >
                    <Package className="h-3 w-3" />
                    Embalagem
                  </button>
                </div>

                {/* Embalagem selector — pre-registered */}
                {pendingEmbTipo === "embalagem" && (pendingMaterial.embalagens?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                      value={pendingEmbId ?? ""}
                      onChange={(e) => {
                        const id = Number(e.target.value) || null;
                        const emb = pendingMaterial.embalagens?.find((o) => o.id === id);
                        setPendingEmbId(id);
                        if (emb) setPendingQty(String(pendingEmbQty * emb.baseQtyPerUnit));
                      }}
                    >
                      <option value="">Selecione a embalagem…</option>
                      {pendingMaterial.embalagens?.map((emb) => (
                        <option key={emb.id} value={emb.id}>
                          {emb.packageType.charAt(0).toUpperCase() + emb.packageType.slice(1).toLowerCase()} — {emb.baseQtyPerUnit} {emb.purchaseUnit} — ${(emb.precoCompra ?? 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd embalagens:</label>
                      <input
                        type="number"
                        value={pendingEmbQty}
                        min={1}
                        step={1}
                        onChange={(e) => {
                          const qty = Math.max(1, parseInt(e.target.value) || 1);
                          const emb = pendingMaterial.embalagens?.find((o) => o.id === pendingEmbId);
                          setPendingEmbQty(qty);
                          if (emb) setPendingQty(String(qty * emb.baseQtyPerUnit));
                        }}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {pendingEmbId && (() => {
                        const emb = pendingMaterial.embalagens?.find((o) => o.id === pendingEmbId);
                        if (!emb) return null;
                        return <span className="text-xs text-muted-foreground">= {pendingEmbQty * emb.baseQtyPerUnit} {emb.purchaseUnit}</span>;
                      })()}
                    </div>
                  </div>
                )}

                {/* Manual embalagem — when no pre-registered options */}
                {pendingEmbTipo === "embalagem" && (pendingMaterial.embalagens?.length ?? 0) === 0 && (
                  <div className="space-y-2 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-2">
                    <p className="text-xs text-muted-foreground">Sem embalagens cadastradas — preencha manualmente:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Tipo</label>
                        <select
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                          value={pendingEmbPkgType}
                          onChange={(e) => setPendingEmbPkgType(e.target.value)}
                        >
                          <option value="">Tipo...</option>
                          {['ROLL','PACK','BOX','BAG','STICK','BUNDLE','PALLET','UNIT'].map(t => (
                            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Qtd/pkg</label>
                        <input
                          type="number" min={0.001} step="any"
                          placeholder="Ex: 100"
                          value={pendingEmbBaseQty ?? ''}
                          onChange={(e) => {
                            const baseQty = Math.max(0.001, Number(e.target.value) || 0);
                            setPendingEmbBaseQty(baseQty);
                            setPendingQty(String(pendingEmbQty * baseQty));
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">$pkg</label>
                        <input
                          type="number" min={0} step="0.01"
                          placeholder="Ex: 45.00"
                          value={pendingEmbPkgPrice ?? ''}
                          onChange={(e) => setPendingEmbPkgPrice(Number(e.target.value) || null)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Qtd pkgs</label>
                        <input
                          type="number" min={1} step={1}
                          value={pendingEmbQty}
                          onChange={(e) => {
                            const qty = Math.max(1, parseInt(e.target.value) || 1);
                            setPendingEmbQty(qty);
                            if (pendingEmbBaseQty) setPendingQty(String(qty * pendingEmbBaseQty));
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    {pendingEmbBaseQty && (
                      <p className="text-xs text-muted-foreground">
                        = <strong>{pendingEmbQty * pendingEmbBaseQty}</strong> {pendingMaterial.unidade} total
                      </p>
                    )}
                  </div>
                )}

                {/* Quantity + unit (unidade mode) */}
                {pendingEmbTipo === "unidade" && (
                  <div className="flex items-center gap-2">
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
                  </div>
                )}

                <Button type="button" size="sm" className="w-full" onClick={addPendingMaterial}>Adicionar</Button>
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
