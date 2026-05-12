/**
 * materialCostService.ts
 *
 * Weighted average cost (CMPM) calculation for materials.
 * Called every time stock is received to keep Material.custoMedio accurate.
 *
 * Formula:
 *   newCustoMedio = (oldQty × oldCustoMedio + purchaseQty × purchaseUnitCost) / (oldQty + purchaseQty)
 *
 * Edge cases:
 *   - First purchase / stock was depleted (oldQty ≤ 0 or no prior custoMedio): reset to purchaseUnitCost
 *   - purchaseQty ≤ 0: no-op (should not happen, but guard anyway)
 */

import { prisma } from '@/lib/prisma';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Recalculates and persists Material.custoMedio + Material.ultimoCusto using the
 * weighted-average method.
 *
 * MUST be called AFTER the corresponding MaterialSaldo has already been updated
 * in the same transaction — the function reads the current total saldo to derive
 * oldQty = totalAfter - purchaseQty.
 *
 * @param tx             Prisma transaction client
 * @param materialId     The material being received
 * @param purchaseQty    Quantity received in BASE UNITS (not packages)
 * @param purchaseUnitCost  Cost per BASE UNIT
 */
export async function recalcCustoMedio(
  tx: Tx,
  materialId: number,
  purchaseQty: number,
  purchaseUnitCost: number,
): Promise<void> {
  if (purchaseQty <= 0 || purchaseUnitCost < 0) return;

  // Read current custoMedio BEFORE this purchase is factored in
  const mat = await tx.material.findUnique({
    where: { id: materialId },
    select: { custoMedio: true },
  });

  // Read total stock AFTER this purchase's saldo increment (already applied by caller)
  const agg = await tx.materialSaldo.aggregate({
    where: { materialId },
    _sum: { quantidade: true },
  });
  const totalAfter = Math.max(0, Number(agg._sum.quantidade ?? 0));

  // Old quantity before this purchase
  const oldQty = totalAfter - purchaseQty;
  const oldCustoMedio = mat?.custoMedio ? Number(mat.custoMedio) : null;

  let newCustoMedio: number;
  if (oldQty <= 0.001 || oldCustoMedio === null || oldCustoMedio <= 0) {
    // First purchase or stock was depleted — reset to the new purchase price
    newCustoMedio = purchaseUnitCost;
  } else {
    // Weighted average
    newCustoMedio = (oldQty * oldCustoMedio + purchaseQty * purchaseUnitCost) / totalAfter;
  }

  // Round to 6 decimal places to avoid floating-point drift
  newCustoMedio = Math.round(newCustoMedio * 1_000_000) / 1_000_000;

  await tx.material.update({
    where: { id: materialId },
    data: {
      custoMedio: newCustoMedio,
      ultimoCusto: purchaseUnitCost,
      ultimaCompraEm: new Date(),
    },
  });
}
