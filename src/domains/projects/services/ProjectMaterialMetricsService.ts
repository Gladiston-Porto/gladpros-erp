import { prisma } from "@/lib/prisma";
import {
  MaterialFlowStatus,
  Prisma,
  PrismaClient,
  ProjetoMovimentacaoEstoque_tipo,
} from "@prisma/client";
import {
  ActualUnitCostSource,
  computeWeightedUnitCost,
  resolveActualUnitCost,
} from "./material-cost/resolveActualUnitCost";

export type RecomputeOpts = {
  dryRun?: boolean;
  includeWarnings?: boolean;
  includeDiagnostics?: boolean;
  since?: string;
  chunkSize?: number;
  cursor?: number;
  maxDiagnosticsMaterials?: number;
  maxWarnings?: number;
};

export type WarningCode =
  | "FALLBACK_LOT_COST"
  | "FALLBACK_PRICEBOOK"
  | "FALLBACK_PLANNED"
  | "FALLBACK_ZERO"
  | "UNPLANNED_OVER_ISSUE"
  | "LEFTOVER_CLAMPED_TO_ZERO"
  | "UNMAPPED_LEDGER_ROW";

export type MetricsWarning = {
  code: WarningCode;
  message: string;
  details?: Record<string, unknown>;
  projetoMaterialId?: number;
};

type LedgerBucket = "ISSUE" | "CONSUME" | "RETURN" | "WASTE" | "DAMAGED" | "LOST";

type LedgerRow = {
  id: number;
  projetoMaterialId: number;
  movementType: ProjetoMovimentacaoEstoque_tipo;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal | null;
  metadadosIntegracao: Prisma.JsonValue;
};

export type RecomputeResult = {
  updatedCount: number;
  totals: {
    plannedCost: Prisma.Decimal;
    actualConsumedCost: Prisma.Decimal;
    varianceCost: Prisma.Decimal;
    pendingQty: Prisma.Decimal;
  };
  warnings: MetricsWarning[];
  meta: {
    mode: "FULL" | "INCREMENTAL";
    chunkSize: number;
    cursorIn: number | null;
    cursorOut: number | null;
    ledgerRowsScanned: number;
    affectedMaterials: number;
  };
  diagnostics?: {
    materials: Array<{
      projectMaterialId: number;
      codigo: string;
      sourceUsed: ActualUnitCostSource;
      warnings: WarningCode[];
      unitCost: string | null;
    }>;
    aggregates: {
      bySourceUsed: Record<ActualUnitCostSource, { count: number }>;
      warningCounts: Record<string, number>;
    };
    limitsApplied: {
      maxDiagnosticsMaterials: number;
      maxWarnings: number;
    };
  };
};

type RecomputeDiagnostics = Exclude<RecomputeResult["diagnostics"], undefined>;

export type CloseoutBlocker = {
  id: number;
  flowStatus: MaterialFlowStatus | null;
  leftoverQty: Prisma.Decimal;
  plannedQty: Prisma.Decimal;
  issuedQty: Prisma.Decimal;
  consumedQty: Prisma.Decimal;
  returnedQty: Prisma.Decimal;
  wasteQty: Prisma.Decimal;
  damagedQty: Prisma.Decimal;
  lostQty: Prisma.Decimal;
};

export type CloseoutBlockersResult = {
  blocking: CloseoutBlocker[];
  counts: {
    flowStatusBlocking: number;
    leftoverBlocking: number;
    totalBlocking: number;
  };
  totalsPendingQty: Prisma.Decimal;
};

const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
const ZERO = D(0);
const DEFAULT_CHUNK_SIZE = 5000;
const MIN_CHUNK_SIZE = 500;
const MAX_CHUNK_SIZE = 20000;
const DEFAULT_MAX_DIAGNOSTICS_MATERIALS = 200;
const MAX_MAX_DIAGNOSTICS_MATERIALS = 1000;
const DEFAULT_MAX_WARNINGS = 200;
const MAX_MAX_WARNINGS = 1000;

function toFixedDecimal(value: Prisma.Decimal, scale = 4): Prisma.Decimal {
  return D(value.toFixed(scale));
}

function safeDivide(numerator: Prisma.Decimal, denominator: Prisma.Decimal): Prisma.Decimal {
  if (denominator.equals(ZERO)) {
    return ZERO;
  }

  return numerator.div(denominator);
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value as number);
  if (normalized < min) {
    return min;
  }

  if (normalized > max) {
    return max;
  }

  return normalized;
}

function getJsonRecord(input: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

function decimalFromUnknown(input: unknown): Prisma.Decimal | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (input instanceof Prisma.Decimal) {
    return input;
  }

  if (typeof input === "number" || typeof input === "string") {
    const normalized = String(input).trim();
    if (!normalized) {
      return null;
    }

    if (Number.isNaN(Number(normalized))) {
      return null;
    }

    return D(normalized);
  }

  return null;
}

function getUpperString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const normalized = code.trim().toUpperCase();
  return normalized || null;
}

type MaterialMetricsRow = {
  id: number;
  codigo: string | null;
  quantidadePlanejada: Prisma.Decimal;
  plannedQty: Prisma.Decimal;
  plannedUnitCost: Prisma.Decimal | null;
  consumedQty: Prisma.Decimal;
  actualUnitCost: Prisma.Decimal | null;
  varianceCost: Prisma.Decimal;
  leftoverQty: Prisma.Decimal;
};

type MaterialComputedTotals = {
  plannedCost: Prisma.Decimal;
  actualConsumedCost: Prisma.Decimal;
  varianceCost: Prisma.Decimal;
  pendingQty: Prisma.Decimal;
};

function computeSnapshotTotals(material: MaterialMetricsRow): MaterialComputedTotals {
  const plannedQty = material.plannedQty.gt(ZERO)
    ? material.plannedQty
    : D(material.quantidadePlanejada.toFixed(4));
  const plannedUnitCost = material.plannedUnitCost ?? ZERO;
  const actualUnitCost = material.actualUnitCost ?? ZERO;

  return {
    plannedCost: toFixedDecimal(plannedQty.mul(plannedUnitCost), 4),
    actualConsumedCost: toFixedDecimal(material.consumedQty.mul(actualUnitCost), 4),
    varianceCost: toFixedDecimal(material.varianceCost, 4),
    pendingQty: toFixedDecimal(material.leftoverQty.gt(ZERO) ? material.leftoverQty : ZERO, 4),
  };
}

export class ProjectMaterialMetricsService {
  constructor(private readonly prismaClient: PrismaClient = prisma as unknown as PrismaClient) {}

  private mapLedgerRow(row: {
    id: number;
    materialId: number;
    tipoMovimentacao: ProjetoMovimentacaoEstoque_tipo;
    quantidade: Prisma.Decimal;
    metadadosIntegracao: Prisma.JsonValue;
  }): LedgerRow {
    const meta = getJsonRecord(row.metadadosIntegracao);
    const unitCost =
      decimalFromUnknown(meta?.unitCost) ??
      decimalFromUnknown(meta?.custoUnitario) ??
      decimalFromUnknown(meta?.actualUnitCost) ??
      decimalFromUnknown(meta?.avgUnitCost) ??
      null;

    return {
      id: row.id,
      projetoMaterialId: row.materialId,
      movementType: row.tipoMovimentacao,
      quantity: row.quantidade,
      unitCost,
      metadadosIntegracao: row.metadadosIntegracao,
    };
  }

  private async scanLedgerRows(
    projectId: number,
    options: {
      chunkSize: number;
      materialIds?: number[];
      cursor?: number | null;
      onRow: (row: LedgerRow) => void;
    }
  ): Promise<{ ledgerRowsScanned: number; cursorOut: number | null }> {
    let currentCursor = options.cursor ?? 0;
    let ledgerRowsScanned = 0;
    let cursorOut: number | null = options.cursor ?? null;

    while (true) {
      const rows = await this.prismaClient.projetoMovimentacaoEstoque.findMany({
        where: {
          projetoId: projectId,
          statusIntegracao: "CONCLUIDA",
          ...(currentCursor > 0 ? { id: { gt: currentCursor } } : {}),
          ...(options.materialIds && options.materialIds.length > 0
            ? { materialId: { in: options.materialIds } }
            : {}),
        },
        orderBy: { id: "asc" },
        take: options.chunkSize,
        select: {
          id: true,
          materialId: true,
          tipoMovimentacao: true,
          quantidade: true,
          metadadosIntegracao: true,
        },
      });

      if (rows.length === 0) {
        break;
      }

      const nextCursor = rows[rows.length - 1]?.id ?? currentCursor;
      if (nextCursor <= currentCursor) {
        break;
      }

      for (const row of rows) {
        options.onRow(this.mapLedgerRow(row));
      }

      ledgerRowsScanned += rows.length;
      currentCursor = nextCursor;
      cursorOut = currentCursor;

      if (rows.length < options.chunkSize) {
        break;
      }
    }

    return {
      ledgerRowsScanned,
      cursorOut,
    };
  }

  private async listAffectedMaterialIds(
    projectId: number,
    options: { sinceDate?: Date | null; cursor?: number | null }
  ): Promise<number[]> {
    const rows = await this.prismaClient.projetoMovimentacaoEstoque.findMany({
      where: {
        projetoId: projectId,
        statusIntegracao: "CONCLUIDA",
        ...(options.sinceDate ? { criadoEm: { gte: options.sinceDate } } : {}),
        ...(options.cursor && options.cursor > 0 ? { id: { gt: options.cursor } } : {}),
      },
      select: { materialId: true },
      distinct: ["materialId"],
    });

    return rows.map((row) => row.materialId);
  }

  private bucketFromMovementType(
    movementType: ProjetoMovimentacaoEstoque_tipo,
    meta: Prisma.JsonValue
  ): LedgerBucket | null {
    if (movementType === "LIBERACAO") {
      return "ISSUE";
    }

    if (movementType === "DEVOLUCAO") {
      return "RETURN";
    }

    if (movementType === "PERDA") {
      const record = getJsonRecord(meta);
      const condicao =
        getUpperString(record, "condicao") ??
        getUpperString(record, "condition") ??
        getUpperString(record, "materialCondition");

      if (condicao?.includes("DANIFIC") || condicao?.includes("DAMAG")) {
        return "DAMAGED";
      }

      if (condicao?.includes("SUCATA") || condicao?.includes("WASTE")) {
        return "WASTE";
      }

      return "LOST";
    }

    if (movementType === "AJUSTE") {
      const record = getJsonRecord(meta);
      const bucket =
        getUpperString(record, "bucket") ??
        getUpperString(record, "movementType") ??
        getUpperString(record, "flowBucket");

      if (bucket === "ISSUE" || bucket === "CONSUME" || bucket === "RETURN" || bucket === "WASTE" || bucket === "DAMAGED" || bucket === "LOST") {
        return bucket;
      }
    }

    return null;
  }

  async recomputeProject(projectId: number, opts: RecomputeOpts = {}): Promise<RecomputeResult> {
    const chunkSize = clampInteger(
      opts.chunkSize,
      DEFAULT_CHUNK_SIZE,
      MIN_CHUNK_SIZE,
      MAX_CHUNK_SIZE
    );
    const maxDiagnosticsMaterials = clampInteger(
      opts.maxDiagnosticsMaterials,
      DEFAULT_MAX_DIAGNOSTICS_MATERIALS,
      1,
      MAX_MAX_DIAGNOSTICS_MATERIALS
    );
    const maxWarnings = clampInteger(opts.maxWarnings, DEFAULT_MAX_WARNINGS, 1, MAX_MAX_WARNINGS);

    const cursorIn = Number.isFinite(opts.cursor) && (opts.cursor as number) > 0
      ? Math.trunc(opts.cursor as number)
      : null;

    const sinceDate = opts.since ? new Date(opts.since) : null;
    if (sinceDate && Number.isNaN(sinceDate.getTime())) {
      throw new Error("INVALID_SINCE");
    }

    const mode: "FULL" | "INCREMENTAL" = sinceDate || cursorIn ? "INCREMENTAL" : "FULL";

    const warnings: MetricsWarning[] = [];
    const warningCodesByMaterial = new Map<number, WarningCode[]>();
    const diagnosticsCandidates: Array<{
      projectMaterialId: number;
      codigo: string;
      sourceUsed: ActualUnitCostSource;
      warnings: WarningCode[];
      unitCost: string | null;
      leftoverQty: Prisma.Decimal;
      warningCount: number;
    }> = [];

    const appendWarning = (warning: MetricsWarning) => {
      warnings.push(warning);

      if (!warning.projetoMaterialId) {
        return;
      }

      const materialWarnings = warningCodesByMaterial.get(warning.projetoMaterialId) ?? [];
      materialWarnings.push(warning.code);
      warningCodesByMaterial.set(warning.projetoMaterialId, materialWarnings);
    };

    const allMateriais = await this.prismaClient.projetoMaterial.findMany({
      where: { projetoId: projectId },
      select: {
        id: true,
        codigo: true,
        quantidadePlanejada: true,
        plannedQty: true,
        plannedUnitCost: true,
        consumedQty: true,
        actualUnitCost: true,
        varianceCost: true,
        leftoverQty: true,
      },
    });

    const affectedMaterialIds =
      mode === "INCREMENTAL"
        ? await this.listAffectedMaterialIds(projectId, { sinceDate, cursor: cursorIn })
        : [];

    if (mode === "INCREMENTAL" && affectedMaterialIds.length === 0) {
      let snapshotPlannedCost = ZERO;
      let snapshotActualConsumedCost = ZERO;
      let snapshotVariance = ZERO;
      let snapshotPendingQty = ZERO;

      for (const material of allMateriais) {
        const snapshot = computeSnapshotTotals(material as MaterialMetricsRow);
        snapshotPlannedCost = snapshotPlannedCost.add(snapshot.plannedCost);
        snapshotActualConsumedCost = snapshotActualConsumedCost.add(snapshot.actualConsumedCost);
        snapshotVariance = snapshotVariance.add(snapshot.varianceCost);
        snapshotPendingQty = snapshotPendingQty.add(snapshot.pendingQty);
      }

      const emptyDiagnostics =
        opts.includeDiagnostics === true
          ? {
              materials: [] as RecomputeDiagnostics["materials"],
              aggregates: {
                bySourceUsed: {
                  MOVEMENT: { count: 0 },
                  LOT: { count: 0 },
                  PRICEBOOK: { count: 0 },
                  PLANNED: { count: 0 },
                  ZERO: { count: 0 },
                },
                warningCounts: {},
              },
              limitsApplied: {
                maxDiagnosticsMaterials,
                maxWarnings,
              },
            }
          : undefined;

      return {
        updatedCount: 0,
        totals: {
          plannedCost: toFixedDecimal(snapshotPlannedCost, 4),
          actualConsumedCost: toFixedDecimal(snapshotActualConsumedCost, 4),
          varianceCost: toFixedDecimal(snapshotVariance, 4),
          pendingQty: toFixedDecimal(snapshotPendingQty, 4),
        },
        warnings: [],
        meta: {
          mode,
          chunkSize,
          cursorIn,
          cursorOut: cursorIn,
          ledgerRowsScanned: 0,
          affectedMaterials: 0,
        },
        ...(emptyDiagnostics ? { diagnostics: emptyDiagnostics } : {}),
      };
    }

    const materiais =
      mode === "INCREMENTAL"
        ? allMateriais.filter((item) => affectedMaterialIds.includes(item.id))
        : allMateriais;

    const normalizedCodes = Array.from(
      new Set(
        materiais
          .map((item) => normalizeCode(item.codigo))
          .filter((code): code is string => Boolean(code))
      )
    );

    const [lotRows, pricebookRows] = await Promise.all([
      normalizedCodes.length > 0
        ? this.prismaClient.material.findMany({
            where: { codigo: { in: normalizedCodes } },
            select: {
              codigo: true,
              custoMedio: true,
              ultimoCusto: true,
            },
          })
        : Promise.resolve([]),
      normalizedCodes.length > 0
        ? this.prismaClient.pricebookItem.findMany({
            where: { sku: { in: normalizedCodes } },
            select: {
              sku: true,
              unitCost: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const lotCostByCode = new Map<
      string,
      {
        custoMedio: Prisma.Decimal | null;
        ultimoCusto: Prisma.Decimal | null;
      }
    >();

    for (const row of lotRows) {
      const code = normalizeCode(row.codigo);
      if (!code) {
        continue;
      }

      lotCostByCode.set(code, {
        custoMedio: row.custoMedio,
        ultimoCusto: row.ultimoCusto,
      });
    }

    const pricebookCostBySku = new Map<string, Prisma.Decimal>();
    for (const row of pricebookRows) {
      const sku = normalizeCode(row.sku);
      if (!sku) {
        continue;
      }

      pricebookCostBySku.set(sku, row.unitCost);
    }

    const aggregated = new Map<
      number,
      {
        issuedQty: Prisma.Decimal;
        consumedQty: Prisma.Decimal;
        returnedQty: Prisma.Decimal;
        wasteQty: Prisma.Decimal;
        damagedQty: Prisma.Decimal;
        lostQty: Prisma.Decimal;
        costQtyConsume: Prisma.Decimal;
        costSumConsume: Prisma.Decimal;
        costQtyIssue: Prisma.Decimal;
        costSumIssue: Prisma.Decimal;
      }
    >();

    for (const material of materiais) {
      aggregated.set(material.id, {
        issuedQty: ZERO,
        consumedQty: ZERO,
        returnedQty: ZERO,
        wasteQty: ZERO,
        damagedQty: ZERO,
        lostQty: ZERO,
        costQtyConsume: ZERO,
        costSumConsume: ZERO,
        costQtyIssue: ZERO,
        costSumIssue: ZERO,
      });
    }

    const scanResult = await this.scanLedgerRows(projectId, {
      chunkSize,
      materialIds: mode === "INCREMENTAL" ? affectedMaterialIds : undefined,
      cursor: null,
      onRow: (row) => {
        const current = aggregated.get(row.projetoMaterialId);
        if (!current) {
          appendWarning({
            code: "UNMAPPED_LEDGER_ROW",
            message: "Linha de ledger sem vínculo ao ProjetoMaterial (ignorada).",
            details: { ledgerId: row.id, projetoMaterialId: row.projetoMaterialId },
          });
          return;
        }

        const bucket = this.bucketFromMovementType(row.movementType, row.metadadosIntegracao);
        if (!bucket) {
          appendWarning({
            code: "UNMAPPED_LEDGER_ROW",
            message: "Tipo de movimentação sem mapeamento para recompute (ignorado).",
            details: { ledgerId: row.id, movementType: row.movementType },
            projetoMaterialId: row.projetoMaterialId,
          });
          return;
        }

        if (bucket === "ISSUE") {
          current.issuedQty = current.issuedQty.add(row.quantity);
          if (row.unitCost) {
            current.costQtyIssue = current.costQtyIssue.add(row.quantity);
            current.costSumIssue = current.costSumIssue.add(row.quantity.mul(row.unitCost));
          }
          return;
        }

        if (bucket === "CONSUME") {
          current.consumedQty = current.consumedQty.add(row.quantity);
          if (row.unitCost) {
            current.costQtyConsume = current.costQtyConsume.add(row.quantity);
            current.costSumConsume = current.costSumConsume.add(row.quantity.mul(row.unitCost));
          }
          return;
        }

        if (bucket === "RETURN") {
          current.returnedQty = current.returnedQty.add(row.quantity);
          return;
        }

        if (bucket === "WASTE") {
          current.wasteQty = current.wasteQty.add(row.quantity);
          return;
        }

        if (bucket === "DAMAGED") {
          current.damagedQty = current.damagedQty.add(row.quantity);
          return;
        }

        current.lostQty = current.lostQty.add(row.quantity);
      },
    });

    const updates: Array<Prisma.PrismaPromise<unknown>> = [];
    let updatedCount = 0;

    let totalPlannedCost = ZERO;
    let totalActualConsumedCost = ZERO;
    let totalVariance = ZERO;
    let totalPendingQty = ZERO;

    if (mode === "INCREMENTAL") {
      for (const material of allMateriais) {
        const snapshot = computeSnapshotTotals(material as MaterialMetricsRow);
        totalPlannedCost = totalPlannedCost.add(snapshot.plannedCost);
        totalActualConsumedCost = totalActualConsumedCost.add(snapshot.actualConsumedCost);
        totalVariance = totalVariance.add(snapshot.varianceCost);
        totalPendingQty = totalPendingQty.add(snapshot.pendingQty);
      }
    }

    for (const material of materiais) {
      const current = aggregated.get(material.id)!;

      const plannedQty = material.plannedQty.gt(ZERO)
        ? material.plannedQty
        : D(material.quantidadePlanejada.toFixed(4));

      const consumeWeightedCost = computeWeightedUnitCost([
        {
          quantity: current.costQtyConsume,
          unitCost: safeDivide(current.costSumConsume, current.costQtyConsume),
        },
      ]);

      const issueWeightedCost = computeWeightedUnitCost([
        {
          quantity: current.costQtyIssue,
          unitCost: safeDivide(current.costSumIssue, current.costQtyIssue),
        },
      ]);

      const movementWeightedCost = consumeWeightedCost ?? issueWeightedCost;
      const normalizedCode = normalizeCode(material.codigo);
      const lotCost = normalizedCode ? lotCostByCode.get(normalizedCode) : undefined;
      const pricebookUnitCost = normalizedCode
        ? pricebookCostBySku.get(normalizedCode) ?? null
        : null;

      const resolvedCost = resolveActualUnitCost({
        movement: {
          unitCost: movementWeightedCost,
          hasAnyCost: current.costQtyConsume.gt(ZERO) || current.costQtyIssue.gt(ZERO),
        },
        lot: lotCost,
        pricebookUnitCost,
        plannedUnitCost: material.plannedUnitCost,
      });

      for (const warningCode of resolvedCost.warnings) {
        appendWarning({
          code: warningCode,
          message: "actualUnitCost resolvido por fallback.",
          details: { sourceUsed: resolvedCost.sourceUsed },
          projetoMaterialId: material.id,
        });
      }

      const actualUnitCost = resolvedCost.unitCost ?? ZERO;
      const plannedUnitCost = material.plannedUnitCost ?? ZERO;
      const plannedCost = toFixedDecimal(plannedQty.mul(plannedUnitCost), 4);
      const actualConsumedCost = toFixedDecimal(current.consumedQty.mul(actualUnitCost), 4);
      const varianceCost = toFixedDecimal(actualConsumedCost.sub(plannedCost), 4);

      let leftoverQty = current.issuedQty
        .sub(current.consumedQty)
        .sub(current.returnedQty)
        .sub(current.wasteQty)
        .sub(current.damagedQty)
        .sub(current.lostQty);

      if (leftoverQty.lt(ZERO)) {
        appendWarning({
          code: "LEFTOVER_CLAMPED_TO_ZERO",
          message: "leftoverQty ficou negativo; clamp para 0 aplicado.",
          details: { computed: leftoverQty.toFixed(6) },
          projetoMaterialId: material.id,
        });
        leftoverQty = ZERO;
      }

      if (current.issuedQty.gt(plannedQty)) {
        appendWarning({
          code: "UNPLANNED_OVER_ISSUE",
          message: "issuedQty > plannedQty (emissão acima do planejado).",
          details: {
            plannedQty: plannedQty.toFixed(4),
            issuedQty: current.issuedQty.toFixed(4),
            overQty: current.issuedQty.sub(plannedQty).toFixed(4),
          },
          projetoMaterialId: material.id,
        });
      }

      if (opts.includeDiagnostics === true) {
        const warningsForMaterial = warningCodesByMaterial.get(material.id) ?? [];
        diagnosticsCandidates.push({
          projectMaterialId: material.id,
          codigo: material.codigo ?? "",
          sourceUsed: resolvedCost.sourceUsed,
          warnings: warningsForMaterial,
          unitCost: resolvedCost.unitCost ? toFixedDecimal(resolvedCost.unitCost, 4).toFixed(4) : null,
          leftoverQty,
          warningCount: warningsForMaterial.length,
        });
      }

      if (mode === "INCREMENTAL") {
        const snapshot = computeSnapshotTotals(material as MaterialMetricsRow);
        totalPlannedCost = totalPlannedCost.sub(snapshot.plannedCost).add(plannedCost);
        totalActualConsumedCost = totalActualConsumedCost
          .sub(snapshot.actualConsumedCost)
          .add(actualConsumedCost);
        totalVariance = totalVariance.sub(snapshot.varianceCost).add(varianceCost);
        totalPendingQty = totalPendingQty.sub(snapshot.pendingQty).add(leftoverQty);
      } else {
        totalPlannedCost = totalPlannedCost.add(plannedCost);
        totalActualConsumedCost = totalActualConsumedCost.add(actualConsumedCost);
        totalVariance = totalVariance.add(varianceCost);
        totalPendingQty = totalPendingQty.add(leftoverQty);
      }

      if (!opts.dryRun) {
        updates.push(
          this.prismaClient.projetoMaterial.update({
            where: { id: material.id },
            data: {
              plannedQty: toFixedDecimal(plannedQty),
              issuedQty: toFixedDecimal(current.issuedQty),
              consumedQty: toFixedDecimal(current.consumedQty),
              returnedQty: toFixedDecimal(current.returnedQty),
              wasteQty: toFixedDecimal(current.wasteQty),
              damagedQty: toFixedDecimal(current.damagedQty),
              lostQty: toFixedDecimal(current.lostQty),
              actualUnitCost: resolvedCost.unitCost ? toFixedDecimal(resolvedCost.unitCost) : null,
              varianceCost,
              leftoverQty: toFixedDecimal(leftoverQty),
            },
          })
        );
      }

      updatedCount += 1;
    }

    if (!opts.dryRun && updates.length > 0) {
      await this.prismaClient.$transaction(updates);
    }

    const sortedDiagnosticsCandidates = diagnosticsCandidates
      .slice()
      .sort((a, b) => {
        if (!a.leftoverQty.equals(b.leftoverQty)) {
          return b.leftoverQty.comparedTo(a.leftoverQty);
        }

        if (a.warningCount !== b.warningCount) {
          return b.warningCount - a.warningCount;
        }

        return a.codigo.localeCompare(b.codigo);
      });

    const diagnostics =
      opts.includeDiagnostics === true
        ? {
            materials: sortedDiagnosticsCandidates.slice(0, maxDiagnosticsMaterials).map((item) => ({
              projectMaterialId: item.projectMaterialId,
              codigo: item.codigo,
              sourceUsed: item.sourceUsed,
              warnings: item.warnings,
              unitCost: item.unitCost,
            })),
            aggregates: {
              bySourceUsed: diagnosticsCandidates.reduce(
                (acc, item) => {
                  acc[item.sourceUsed].count += 1;
                  return acc;
                },
                {
                  MOVEMENT: { count: 0 },
                  LOT: { count: 0 },
                  PRICEBOOK: { count: 0 },
                  PLANNED: { count: 0 },
                  ZERO: { count: 0 },
                } as Record<ActualUnitCostSource, { count: number }>
              ),
              warningCounts: warnings.reduce<Record<string, number>>((acc, warning) => {
                acc[warning.code] = (acc[warning.code] ?? 0) + 1;
                return acc;
              }, {}),
            },
            limitsApplied: {
              maxDiagnosticsMaterials,
              maxWarnings,
            },
          }
        : undefined;

    const outputWarnings =
      opts.includeWarnings === false ? [] : warnings.slice(0, maxWarnings);

    return {
      updatedCount,
      totals: {
        plannedCost: toFixedDecimal(totalPlannedCost, 4),
        actualConsumedCost: toFixedDecimal(totalActualConsumedCost, 4),
        varianceCost: toFixedDecimal(totalVariance, 4),
        pendingQty: toFixedDecimal(totalPendingQty, 4),
      },
      warnings: outputWarnings,
      meta: {
        mode,
        chunkSize,
        cursorIn,
        cursorOut: scanResult.cursorOut,
        ledgerRowsScanned: scanResult.ledgerRowsScanned,
        affectedMaterials: mode === "INCREMENTAL" ? affectedMaterialIds.length : materiais.length,
      },
      ...(diagnostics ? { diagnostics } : {}),
    };
  }

  async getCloseoutBlockers(projectId: number, options?: { take?: number }): Promise<CloseoutBlockersResult> {
    const take = Math.max(1, options?.take ?? 10);

    const blocking = await this.prismaClient.projetoMaterial.findMany({
      where: {
        projetoId: projectId,
        OR: [
          { flowStatus: { in: [MaterialFlowStatus.ISSUED, MaterialFlowStatus.RETURN_PENDING] } },
          { leftoverQty: { gt: ZERO } },
        ],
      },
      select: {
        id: true,
        flowStatus: true,
        leftoverQty: true,
        plannedQty: true,
        issuedQty: true,
        consumedQty: true,
        returnedQty: true,
        wasteQty: true,
        damagedQty: true,
        lostQty: true,
      },
      orderBy: [{ leftoverQty: "desc" }, { id: "asc" }],
      take,
    });

    const allBlocking = await this.prismaClient.projetoMaterial.findMany({
      where: {
        projetoId: projectId,
        OR: [
          { flowStatus: { in: [MaterialFlowStatus.ISSUED, MaterialFlowStatus.RETURN_PENDING] } },
          { leftoverQty: { gt: ZERO } },
        ],
      },
      select: {
        flowStatus: true,
        leftoverQty: true,
      },
    });

    const flowStatusBlocking = allBlocking.filter((item) =>
      item.flowStatus === MaterialFlowStatus.ISSUED || item.flowStatus === MaterialFlowStatus.RETURN_PENDING
    ).length;

    const leftoverBlocking = allBlocking.filter((item) => item.leftoverQty.gt(ZERO)).length;

    const totalsPendingQty = allBlocking.reduce(
      (acc, item) => acc.add(item.leftoverQty.gt(ZERO) ? item.leftoverQty : ZERO),
      ZERO
    );

    return {
      blocking,
      counts: {
        flowStatusBlocking,
        leftoverBlocking,
        totalBlocking: allBlocking.length,
      },
      totalsPendingQty: toFixedDecimal(totalsPendingQty, 4),
    };
  }
}
