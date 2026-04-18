import { Prisma } from "@prisma/client";
import {
  computeWeightedUnitCost,
  resolveActualUnitCost,
} from "../material-cost/resolveActualUnitCost";

const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);

describe("resolveActualUnitCost", () => {
  it("prioriza MOVEMENT quando válido", () => {
    const result = resolveActualUnitCost({
      movement: { unitCost: D("12.5") },
      lot: { custoMedio: D("8.0"), ultimoCusto: D("7.0") },
      pricebookUnitCost: D("6.0"),
      plannedUnitCost: D("5.0"),
    });

    expect(result.sourceUsed).toBe("MOVEMENT");
    expect(result.unitCost?.toFixed(4)).toBe("12.5000");
    expect(result.warnings).toEqual([]);
  });

  it("usa LOT.custoMedio quando movement é inválido", () => {
    const result = resolveActualUnitCost({
      movement: { unitCost: D("0") },
      lot: { custoMedio: D("8.0"), ultimoCusto: D("7.0") },
      pricebookUnitCost: D("6.0"),
      plannedUnitCost: D("5.0"),
    });

    expect(result.sourceUsed).toBe("LOT");
    expect(result.unitCost?.toFixed(4)).toBe("8.0000");
    expect(result.warnings).toEqual(["FALLBACK_LOT_COST"]);
  });

  it("usa LOT.ultimoCusto quando custoMedio está vazio", () => {
    const result = resolveActualUnitCost({
      movement: { unitCost: null },
      lot: { custoMedio: null, ultimoCusto: D("7.0") },
      pricebookUnitCost: D("6.0"),
      plannedUnitCost: D("5.0"),
    });

    expect(result.sourceUsed).toBe("LOT");
    expect(result.unitCost?.toFixed(4)).toBe("7.0000");
    expect(result.warnings).toEqual(["FALLBACK_LOT_COST"]);
  });

  it("usa PRICEBOOK quando LOT está indisponível", () => {
    const result = resolveActualUnitCost({
      movement: { unitCost: null },
      lot: { custoMedio: D("0"), ultimoCusto: null },
      pricebookUnitCost: D("6.0"),
      plannedUnitCost: D("5.0"),
    });

    expect(result.sourceUsed).toBe("PRICEBOOK");
    expect(result.unitCost?.toFixed(4)).toBe("6.0000");
    expect(result.warnings).toEqual(["FALLBACK_PRICEBOOK"]);
  });

  it("usa PLANNED quando PRICEBOOK está indisponível", () => {
    const result = resolveActualUnitCost({
      movement: { unitCost: null },
      lot: { custoMedio: null, ultimoCusto: null },
      pricebookUnitCost: D("0"),
      plannedUnitCost: D("5.0"),
    });

    expect(result.sourceUsed).toBe("PLANNED");
    expect(result.unitCost?.toFixed(4)).toBe("5.0000");
    expect(result.warnings).toEqual(["FALLBACK_PLANNED"]);
  });

  it("retorna ZERO quando tudo está indisponível", () => {
    const result = resolveActualUnitCost({
      movement: { unitCost: null },
      lot: { custoMedio: null, ultimoCusto: null },
      pricebookUnitCost: null,
      plannedUnitCost: null,
    });

    expect(result.sourceUsed).toBe("ZERO");
    expect(result.unitCost).toBeNull();
    expect(result.warnings).toEqual(["FALLBACK_ZERO"]);
  });

  it("trata 0 e negativos como indisponíveis", () => {
    const result = resolveActualUnitCost({
      movement: { unitCost: D("-1") },
      lot: { custoMedio: D("0"), ultimoCusto: D("-3") },
      pricebookUnitCost: D("0"),
      plannedUnitCost: D("-2"),
    });

    expect(result.sourceUsed).toBe("ZERO");
    expect(result.unitCost).toBeNull();
    expect(result.warnings).toEqual(["FALLBACK_ZERO"]);
  });
});

describe("computeWeightedUnitCost", () => {
  it("calcula média ponderada considerando apenas qty>0 e unitCost>0", () => {
    const result = computeWeightedUnitCost([
      { quantity: D("2"), unitCost: D("10") },
      { quantity: D("1"), unitCost: D("4") },
      { quantity: D("0"), unitCost: D("20") },
      { quantity: D("3"), unitCost: D("0") },
      { quantity: D("-5"), unitCost: D("9") },
    ]);

    expect(result?.toFixed(4)).toBe("8.0000");
  });

  it("retorna null quando não há linhas válidas", () => {
    const result = computeWeightedUnitCost([
      { quantity: D("0"), unitCost: D("10") },
      { quantity: D("1"), unitCost: D("0") },
      { quantity: null, unitCost: D("5") },
    ]);

    expect(result).toBeNull();
  });
});