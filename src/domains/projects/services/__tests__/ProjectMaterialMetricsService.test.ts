import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProjectMaterialMetricsService } from "../ProjectMaterialMetricsService";

jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projetoMaterial: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    material: {
      findMany: jest.fn(),
    },
    pricebookItem: {
      findMany: jest.fn(),
    },
    projetoMovimentacaoEstoque: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as any;
const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);

describe("ProjectMaterialMetricsService", () => {
  let service: ProjectMaterialMetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectMaterialMetricsService();

    (mockPrisma.material.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.pricebookItem.findMany as jest.Mock).mockResolvedValue([]);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (ops: Array<Promise<unknown>>) =>
      Promise.all(ops)
    );

    (mockPrisma.projetoMaterial.update as jest.Mock).mockImplementation(async (args: any) => ({
      id: args.where.id,
      ...args.data,
    }));
  });

  it("recompute básico calcula issued/returned/leftover", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("10.000"), plannedQty: D("10.0000"), plannedUnitCost: D("5.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 101,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("8.000"),
        metadadosIntegracao: { unitCost: "6.00" },
      },
      {
        id: 102,
        materialId: 1,
        tipoMovimentacao: "DEVOLUCAO",
        quantidade: D("2.000"),
        metadadosIntegracao: null,
      },
    ]);

    const result = await service.recomputeProject(10);

    expect(result.updatedCount).toBe(1);
    expect(result.totals.pendingQty.toFixed(4)).toBe("6.0000");
    expect(mockPrisma.projetoMaterial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          issuedQty: expect.any(Prisma.Decimal),
          returnedQty: expect.any(Prisma.Decimal),
          leftoverQty: expect.any(Prisma.Decimal),
        }),
      })
    );
  });

  it("é idempotente para mesmo ledger", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("10.000"), plannedQty: D("10.0000"), plannedUnitCost: D("5.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 101,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("5.000"),
        metadadosIntegracao: { unitCost: "6.00" },
      },
    ]);

    const first = await service.recomputeProject(10);
    const second = await service.recomputeProject(10);

    expect(first.totals.pendingQty.toFixed(4)).toBe(second.totals.pendingQty.toFixed(4));
    expect(first.totals.varianceCost.toFixed(4)).toBe(second.totals.varianceCost.toFixed(4));
  });

  it("prioriza média ponderada de CONSUME para actualUnitCost", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("10.000"), plannedQty: D("10.0000"), plannedUnitCost: D("7.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 111,
        materialId: 1,
        tipoMovimentacao: "AJUSTE",
        quantidade: D("2.000"),
        metadadosIntegracao: { bucket: "CONSUME", unitCost: "10.00" },
      },
      {
        id: 112,
        materialId: 1,
        tipoMovimentacao: "AJUSTE",
        quantidade: D("1.000"),
        metadadosIntegracao: { bucket: "CONSUME", unitCost: "4.00" },
      },
      {
        id: 113,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("8.000"),
        metadadosIntegracao: { unitCost: "20.00" },
      },
    ]);

    await service.recomputeProject(10);

    const payload = (mockPrisma.projetoMaterial.update as jest.Mock).mock.calls[0][0].data;
    expect(payload.actualUnitCost.toFixed(4)).toBe("8.0000");
  });

  it("usa fallback plannedUnitCost com warning quando ledger não traz custo", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("10.000"), plannedQty: D("10.0000"), plannedUnitCost: D("9.5000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 121,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("3.000"),
        metadadosIntegracao: {},
      },
    ]);

    const result = await service.recomputeProject(10);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "FALLBACK_PLANNED", projetoMaterialId: 1 }),
      ])
    );
  });

  it("usa fallback LOT/STOCK quando movimento não traz custo", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        codigo: "MAT-001",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: D("9.5000"),
      },
    ]);

    (mockPrisma.material.findMany as jest.Mock).mockResolvedValue([
      { codigo: "MAT-001", custoMedio: D("13.2000"), ultimoCusto: D("12.1000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 122,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("3.000"),
        metadadosIntegracao: {},
      },
    ]);

    await service.recomputeProject(10);

    const payload = (mockPrisma.projetoMaterial.update as jest.Mock).mock.calls[0][0].data;
    expect(payload.actualUnitCost.toFixed(4)).toBe("13.2000");
  });

  it("usa fallback PRICEBOOK quando LOT/STOCK está indisponível", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        codigo: "MAT-002",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: D("9.5000"),
      },
    ]);

    (mockPrisma.material.findMany as jest.Mock).mockResolvedValue([
      { codigo: "MAT-002", custoMedio: D("0"), ultimoCusto: null },
    ]);

    (mockPrisma.pricebookItem.findMany as jest.Mock).mockResolvedValue([
      { sku: "MAT-002", unitCost: D("15.7000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 123,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("3.000"),
        metadadosIntegracao: {},
      },
    ]);

    const result = await service.recomputeProject(10);

    const payload = (mockPrisma.projetoMaterial.update as jest.Mock).mock.calls[0][0].data;
    expect(payload.actualUnitCost.toFixed(4)).toBe("15.7000");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "FALLBACK_PRICEBOOK", projetoMaterialId: 1 }),
      ])
    );
  });

  it("gera warning UNPLANNED_OVER_ISSUE quando issued > planned", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("5.000"), plannedQty: D("5.0000"), plannedUnitCost: D("3.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 131,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("7.000"),
        metadadosIntegracao: {},
      },
    ]);

    const result = await service.recomputeProject(10);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNPLANNED_OVER_ISSUE", projetoMaterialId: 1 }),
      ])
    );
  });

  it("aplica clamp quando leftover fica negativo", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("10.000"), plannedQty: D("10.0000"), plannedUnitCost: D("3.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 141,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("1.000"),
        metadadosIntegracao: {},
      },
      {
        id: 142,
        materialId: 1,
        tipoMovimentacao: "AJUSTE",
        quantidade: D("2.000"),
        metadadosIntegracao: { bucket: "CONSUME" },
      },
    ]);

    const result = await service.recomputeProject(10);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "LEFTOVER_CLAMPED_TO_ZERO", projetoMaterialId: 1 }),
      ])
    );

    const payload = (mockPrisma.projetoMaterial.update as jest.Mock).mock.calls[0][0].data;
    expect(payload.leftoverQty.toFixed(4)).toBe("0.0000");
  });

  it("gera warning para linha de ledger sem mapeamento", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("10.000"), plannedQty: D("10.0000"), plannedUnitCost: D("3.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 151,
        materialId: 999,
        tipoMovimentacao: "AJUSTE",
        quantidade: D("1.000"),
        metadadosIntegracao: {},
      },
    ]);

    const result = await service.recomputeProject(10);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNMAPPED_LEDGER_ROW" }),
      ])
    );
  });

  it("dryRun não persiste no banco", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      { id: 1, quantidadePlanejada: D("10.000"), plannedQty: D("10.0000"), plannedUnitCost: D("3.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([
      {
        id: 161,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("2.000"),
        metadadosIntegracao: {},
      },
    ]);

    await service.recomputeProject(10, { dryRun: true });

    expect(mockPrisma.projetoMaterial.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("não retorna diagnostics quando includeDiagnostics=false", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        codigo: "MAT-003",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: D("7.5000"),
      },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.recomputeProject(10, {
      includeWarnings: true,
      includeDiagnostics: false,
    });

    expect(result).not.toHaveProperty("diagnostics");
  });

  it("retorna diagnostics com sourceUsed e agregados quando includeDiagnostics=true", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        codigo: "MAT-004",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: D("9.5000"),
      },
      {
        id: 2,
        codigo: "MAT-005",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: null,
      },
    ]);

    (mockPrisma.material.findMany as jest.Mock).mockResolvedValue([
      { codigo: "MAT-004", custoMedio: D("11.2500"), ultimoCusto: D("10.0000") },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.recomputeProject(10, {
      includeWarnings: true,
      includeDiagnostics: true,
    });

    expect(result.diagnostics?.materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          projectMaterialId: 1,
          codigo: "MAT-004",
          sourceUsed: "LOT",
          warnings: expect.arrayContaining(["FALLBACK_LOT_COST"]),
          unitCost: "11.2500",
        }),
        expect.objectContaining({
          projectMaterialId: 2,
          codigo: "MAT-005",
          sourceUsed: "ZERO",
          warnings: expect.arrayContaining(["FALLBACK_ZERO"]),
          unitCost: null,
        }),
      ])
    );

    expect(result.diagnostics?.aggregates.bySourceUsed).toEqual(
      expect.objectContaining({
        LOT: { count: 1 },
        ZERO: { count: 1 },
      })
    );

    expect(result.diagnostics?.aggregates.warningCounts).toEqual(
      expect.objectContaining({
        FALLBACK_LOT_COST: 1,
        FALLBACK_ZERO: 1,
      })
    );
  });

  it("mantém totais determinísticos com chunkSize pequeno", async () => {
    const materials = [
      {
        id: 1,
        codigo: "MAT-CH-1",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: D("2.0000"),
        consumedQty: D("0"),
        actualUnitCost: null,
        varianceCost: D("0"),
        leftoverQty: D("0"),
      },
      {
        id: 2,
        codigo: "MAT-CH-2",
        quantidadePlanejada: D("5.000"),
        plannedQty: D("5.0000"),
        plannedUnitCost: D("3.0000"),
        consumedQty: D("0"),
        actualUnitCost: null,
        varianceCost: D("0"),
        leftoverQty: D("0"),
      },
    ];

    const ledgerRows = [
      {
        id: 10,
        materialId: 1,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("4.000"),
        metadadosIntegracao: { unitCost: "2.50" },
      },
      {
        id: 11,
        materialId: 1,
        tipoMovimentacao: "AJUSTE",
        quantidade: D("2.000"),
        metadadosIntegracao: { bucket: "CONSUME", unitCost: "2.50" },
      },
      {
        id: 12,
        materialId: 2,
        tipoMovimentacao: "LIBERACAO",
        quantidade: D("2.000"),
        metadadosIntegracao: { unitCost: "4.00" },
      },
    ];

    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue(materials);
    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockImplementation(async (args: any) => {
      const gt = args?.where?.id?.gt ?? 0;
      const take = args?.take ?? 5000;
      const filtered = ledgerRows.filter((row) => row.id > gt);
      return filtered.slice(0, take);
    });

    const resultChunked = await service.recomputeProject(10, { chunkSize: 500 });

    jest.clearAllMocks();
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue(materials);
    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockImplementation(async (args: any) => {
      const gt = args?.where?.id?.gt ?? 0;
      const take = args?.take ?? 5000;
      const filtered = ledgerRows.filter((row) => row.id > gt);
      return filtered.slice(0, take);
    });

    const resultDefaultChunk = await service.recomputeProject(10);

    expect(resultChunked.totals.pendingQty.toFixed(4)).toBe(resultDefaultChunk.totals.pendingQty.toFixed(4));
    expect(resultChunked.totals.varianceCost.toFixed(4)).toBe(resultDefaultChunk.totals.varianceCost.toFixed(4));
    expect(resultChunked.meta.chunkSize).toBe(500);
  });

  it("incremental since sem eventos faz short-circuit", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        codigo: "MAT-INC-1",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: D("5.0000"),
        consumedQty: D("2.0000"),
        actualUnitCost: D("4.0000"),
        varianceCost: D("-42.0000"),
        leftoverQty: D("1.0000"),
      },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.recomputeProject(10, {
      since: "2026-02-20T00:00:00.000Z",
    });

    expect(result.updatedCount).toBe(0);
    expect(result.meta.mode).toBe("INCREMENTAL");
    expect(result.meta.ledgerRowsScanned).toBe(0);
  });

  it("diagnostics e warnings respeitam limites", async () => {
    (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        codigo: "MAT-LIM-1",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: null,
        consumedQty: D("0"),
        actualUnitCost: null,
        varianceCost: D("0"),
        leftoverQty: D("0"),
      },
      {
        id: 2,
        codigo: "MAT-LIM-2",
        quantidadePlanejada: D("10.000"),
        plannedQty: D("10.0000"),
        plannedUnitCost: null,
        consumedQty: D("0"),
        actualUnitCost: null,
        varianceCost: D("0"),
        leftoverQty: D("0"),
      },
    ]);

    (mockPrisma.projetoMovimentacaoEstoque.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.recomputeProject(10, {
      includeDiagnostics: true,
      maxDiagnosticsMaterials: 1,
      maxWarnings: 1,
    });

    expect(result.diagnostics?.materials.length).toBe(1);
    expect(result.warnings.length).toBe(1);
    expect(result.diagnostics?.limitsApplied).toEqual({
      maxDiagnosticsMaterials: 1,
      maxWarnings: 1,
    });
  });
});
