"use client";

import { Plus, Trash2, X } from "lucide-react";

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
  const filteredMaterials = stockMaterials
    .filter((material) =>
      material.nome.toLowerCase().includes(materialSearch.toLowerCase())
    )
    .slice(0, 8);

  const addPendingMaterial = () => {
    if (!pendingMaterial || parseFloat(pendingQty) <= 0) {
      return;
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
      },
    ]);
    setPendingMaterial(null);
    setPendingQty("1");
    setMaterialSearch("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Materiais Planejados ({plannedMaterials.length})</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={onOpenMaterialSearch}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {plannedMaterials.length === 0 && !showMaterialSearch && (
          <p className="py-4 text-center text-muted-foreground">
            Nenhum material adicionado ainda
          </p>
        )}

        {plannedMaterials.length > 0 && (
          <div className="mb-4 space-y-2">
            {plannedMaterials.map((material, index) => (
              <div
                key={`${material.materialId}-${index}`}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <span className="font-medium text-foreground">{material.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {material.quantityPlanned} {material.unit}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {material.quantityPlanned > material.stockQty ? (
                    <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      Comprar
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Em estoque ({material.stockQty})
                    </span>
                  )}
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
            ))}
            <div className="flex justify-between border-t border-border pt-2 text-sm text-muted-foreground">
              <span>
                {
                  plannedMaterials.filter(
                    (material) => material.quantityPlanned > material.stockQty
                  ).length
                }{" "}
                item(s) precisam compra
              </span>
              <span>
                Est. $
                {plannedMaterials
                  .reduce(
                    (sum, material) =>
                      sum + material.quantityPlanned * material.unitCostEstimated,
                    0
                  )
                  .toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {showMaterialSearch && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Selecionar material
              </span>
              <button
                type="button"
                aria-label="Fechar painel de materiais"
                onClick={() => {
                  setShowMaterialSearch(false);
                  setMaterialSearch("");
                  setPendingMaterial(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder="Buscar material..."
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
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addPendingMaterial();
                    }
                  }}
                  min="0.01"
                  step="0.01"
                  aria-label="Quantidade"
                  placeholder="1"
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">
                  {pendingMaterial.unidade}
                </span>
                <Button type="button" size="sm" onClick={addPendingMaterial}>
                  Adicionar
                </Button>
                <button
                  type="button"
                  aria-label="Cancelar seleção de material"
                  onClick={() => {
                    setPendingMaterial(null);
                    setPendingQty("1");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background">
              {filteredMaterials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => {
                    setPendingMaterial(material);
                    setPendingQty("1");
                  }}
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
                  Nenhum material encontrado
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
