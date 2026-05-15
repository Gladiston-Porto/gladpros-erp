/** @jest-environment node */

export {};

const mockRequireProjectPermission = jest.fn();
const mockRecomputeProject = jest.fn();

jest.mock("@/shared/lib/rbac-projects", () => ({
  requireProjectPermission: (...args: unknown[]) =>
    mockRequireProjectPermission(...args),
  requireProjectAccess: jest.fn().mockResolvedValue({ id: 10, clienteId: 1, responsavelId: null }),
}));

jest.mock("@/domains/projects/services/ProjectMaterialMetricsService", () => ({
  ProjectMaterialMetricsService: jest.fn().mockImplementation(() => ({
    recomputeProject: (...args: unknown[]) => mockRecomputeProject(...args),
  })),
}));

const { POST } = require("../route");

function makeContext(id = "1") {
  return { params: Promise.resolve({ id }) } as {
    params: Promise<{ id: string }>;
  };
}

function makeJsonRequest(body: unknown, query?: Record<string, string>) {
  return {
    json: jest.fn().mockResolvedValue(body),
    nextUrl: {
      searchParams: new URLSearchParams(query),
    },
  } as any;
}

describe("POST /api/projetos/[id]/materials/recompute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 403 quando RBAC nega", async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error("FORBIDDEN"));

    const response = await POST(makeJsonRequest({}), makeContext("10"));
    expect(response.status).toBe(403);
  });

  it("retorna 200 no recompute", async () => {
    mockRequireProjectPermission.mockResolvedValue({ id: 7, role: "FINANCEIRO" });
    mockRecomputeProject.mockResolvedValue({
      updatedCount: 2,
      totals: {
        plannedCost: "10.0000",
        actualConsumedCost: "8.0000",
        varianceCost: "-2.0000",
        pendingQty: "1.5000",
      },
      warnings: [],
    });

    const response = await POST(makeJsonRequest({}), makeContext("10"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockRecomputeProject).toHaveBeenCalledWith(10, {
      dryRun: undefined,
      since: undefined,
      cursor: undefined,
      chunkSize: undefined,
      includeWarnings: true,
      includeDiagnostics: false,
      maxDiagnosticsMaterials: undefined,
      maxWarnings: undefined,
    });
    expect(json).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          updatedCount: 2,
        }),
        success: true,
      })
    );
    expect(json.data).not.toHaveProperty("diagnostics");
  });

  it("dryRun é repassado sem persistir no service", async () => {
    mockRequireProjectPermission.mockResolvedValue({ id: 7, role: "FINANCEIRO" });
    mockRecomputeProject.mockResolvedValue({
      updatedCount: 2,
      totals: {
        plannedCost: "10.0000",
        actualConsumedCost: "8.0000",
        varianceCost: "-2.0000",
        pendingQty: "1.5000",
      },
      warnings: [],
    });

    const response = await POST(makeJsonRequest({ dryRun: true }), makeContext("10"));

    expect(response.status).toBe(200);
    expect(mockRecomputeProject).toHaveBeenCalledWith(10, {
      dryRun: true,
      since: undefined,
      cursor: undefined,
      chunkSize: undefined,
      includeWarnings: true,
      includeDiagnostics: false,
      maxDiagnosticsMaterials: undefined,
      maxWarnings: undefined,
    });
  });

  it("retorna diagnostics quando includeDiagnostics=true no body", async () => {
    mockRequireProjectPermission.mockResolvedValue({ id: 7, role: "FINANCEIRO" });
    mockRecomputeProject.mockResolvedValue({
      updatedCount: 1,
      totals: {
        plannedCost: "10.0000",
        actualConsumedCost: "8.0000",
        varianceCost: "-2.0000",
        pendingQty: "1.5000",
      },
      warnings: [],
      diagnostics: {
        materials: [
          {
            projectMaterialId: 1,
            codigo: "MAT-001",
            sourceUsed: "LOT",
            warnings: ["FALLBACK_LOT_COST"],
            unitCost: "10.5000",
          },
        ],
        aggregates: {
          bySourceUsed: {
            MOVEMENT: { count: 0 },
            LOT: { count: 1 },
            PRICEBOOK: { count: 0 },
            PLANNED: { count: 0 },
            ZERO: { count: 0 },
          },
          warningCounts: {
            FALLBACK_LOT_COST: 1,
          },
        },
      },
    });

    const response = await POST(makeJsonRequest({ includeDiagnostics: true }), makeContext("10"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockRecomputeProject).toHaveBeenCalledWith(10, {
      dryRun: undefined,
      since: undefined,
      cursor: undefined,
      chunkSize: undefined,
      includeWarnings: true,
      includeDiagnostics: true,
      maxDiagnosticsMaterials: undefined,
      maxWarnings: undefined,
    });
    expect(json).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          diagnostics: expect.objectContaining({
            materials: expect.any(Array),
            aggregates: expect.any(Object),
          }),
        }),
        success: true,
      })
    );
  });

  it("query includeDiagnostics=true tem prioridade sobre body=false", async () => {
    mockRequireProjectPermission.mockResolvedValue({ id: 7, role: "FINANCEIRO" });
    mockRecomputeProject.mockResolvedValue({
      updatedCount: 0,
      totals: {
        plannedCost: "0.0000",
        actualConsumedCost: "0.0000",
        varianceCost: "0.0000",
        pendingQty: "0.0000",
      },
      warnings: [],
      meta: {
        mode: "FULL",
        chunkSize: 5000,
        cursorIn: null,
        cursorOut: null,
        ledgerRowsScanned: 0,
        affectedMaterials: 0,
      },
    });

    const response = await POST(
      makeJsonRequest({ includeDiagnostics: false }, { includeDiagnostics: "true" }),
      makeContext("10")
    );

    expect(response.status).toBe(200);
    expect(mockRecomputeProject).toHaveBeenCalledWith(10, {
      dryRun: undefined,
      since: undefined,
      cursor: undefined,
      chunkSize: undefined,
      includeWarnings: true,
      includeDiagnostics: true,
      maxDiagnosticsMaterials: undefined,
      maxWarnings: undefined,
    });
  });

  it("retorna 422 quando since é inválido", async () => {
    mockRequireProjectPermission.mockResolvedValue({ id: 7, role: "FINANCEIRO" });

    const response = await POST(
      makeJsonRequest({ since: "data-invalida" }),
      makeContext("10")
    );

    expect(response.status).toBe(422);
    expect(mockRecomputeProject).not.toHaveBeenCalled();
  });

  it("retorna 422 quando chunkSize está fora do range", async () => {
    mockRequireProjectPermission.mockResolvedValue({ id: 7, role: "FINANCEIRO" });

    const response = await POST(
      makeJsonRequest({ chunkSize: 499 }),
      makeContext("10")
    );

    expect(response.status).toBe(422);
    expect(mockRecomputeProject).not.toHaveBeenCalled();
  });
});
