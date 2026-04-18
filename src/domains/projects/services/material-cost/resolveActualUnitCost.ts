import { Prisma } from "@prisma/client";

const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
const ZERO = D(0);

export type ActualUnitCostSource = "MOVEMENT" | "LOT" | "PRICEBOOK" | "PLANNED" | "ZERO";

export type ActualUnitCostWarningCode =
  | "FALLBACK_LOT_COST"
  | "FALLBACK_PRICEBOOK"
  | "FALLBACK_PLANNED"
  | "FALLBACK_ZERO";

export type ResolveActualUnitCostInput = {
  movement?: {
    unitCost?: Prisma.Decimal | null;
    hasAnyCost?: boolean;
  } | null;
  lot?: {
    custoMedio?: Prisma.Decimal | null;
    ultimoCusto?: Prisma.Decimal | null;
  } | null;
  pricebookUnitCost?: Prisma.Decimal | null;
  plannedUnitCost?: Prisma.Decimal | null;
};

export type ResolveActualUnitCostResult = {
  unitCost: Prisma.Decimal | null;
  sourceUsed: ActualUnitCostSource;
  warnings: ActualUnitCostWarningCode[];
};

export type WeightedUnitCostRow = {
  quantity?: Prisma.Decimal | null;
  unitCost?: Prisma.Decimal | null;
};

function isPositiveDecimal(value: Prisma.Decimal | null | undefined): value is Prisma.Decimal {
  return Boolean(value && value.gt(ZERO));
}

function fallbackWarningForSource(sourceUsed: ActualUnitCostSource): ActualUnitCostWarningCode[] {
  if (sourceUsed === "LOT") {
    return ["FALLBACK_LOT_COST"];
  }

  if (sourceUsed === "PRICEBOOK") {
    return ["FALLBACK_PRICEBOOK"];
  }

  if (sourceUsed === "PLANNED") {
    return ["FALLBACK_PLANNED"];
  }

  if (sourceUsed === "ZERO") {
    return ["FALLBACK_ZERO"];
  }

  return [];
}

export function computeWeightedUnitCost(rows: WeightedUnitCostRow[]): Prisma.Decimal | null {
  let sumQty = ZERO;
  let sumCost = ZERO;

  for (const row of rows) {
    if (!isPositiveDecimal(row.quantity) || !isPositiveDecimal(row.unitCost)) {
      continue;
    }

    sumQty = sumQty.add(row.quantity);
    sumCost = sumCost.add(row.quantity.mul(row.unitCost));
  }

  if (!sumQty.gt(ZERO)) {
    return null;
  }

  return sumCost.div(sumQty);
}

export function resolveActualUnitCost(input: ResolveActualUnitCostInput): ResolveActualUnitCostResult {
  const movementUnitCost = input.movement?.unitCost ?? null;
  if (isPositiveDecimal(movementUnitCost)) {
    return { unitCost: movementUnitCost, sourceUsed: "MOVEMENT", warnings: [] };
  }

  const lotCustoMedio = input.lot?.custoMedio ?? null;
  if (isPositiveDecimal(lotCustoMedio)) {
    return {
      unitCost: lotCustoMedio,
      sourceUsed: "LOT",
      warnings: fallbackWarningForSource("LOT"),
    };
  }

  const lotUltimoCusto = input.lot?.ultimoCusto ?? null;
  if (isPositiveDecimal(lotUltimoCusto)) {
    return {
      unitCost: lotUltimoCusto,
      sourceUsed: "LOT",
      warnings: fallbackWarningForSource("LOT"),
    };
  }

  const pricebookUnitCost = input.pricebookUnitCost ?? null;
  if (isPositiveDecimal(pricebookUnitCost)) {
    return {
      unitCost: pricebookUnitCost,
      sourceUsed: "PRICEBOOK",
      warnings: fallbackWarningForSource("PRICEBOOK"),
    };
  }

  const plannedUnitCost = input.plannedUnitCost ?? null;
  if (isPositiveDecimal(plannedUnitCost)) {
    return {
      unitCost: plannedUnitCost,
      sourceUsed: "PLANNED",
      warnings: fallbackWarningForSource("PLANNED"),
    };
  }

  return {
    unitCost: null,
    sourceUsed: "ZERO",
    warnings: fallbackWarningForSource("ZERO"),
  };
}