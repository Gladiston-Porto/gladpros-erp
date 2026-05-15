jest.mock("@/lib/prisma", () => ({
  prisma: {
    projeto: { findUnique: jest.fn() },
    projectCloseout: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    closeoutTemplate: { findMany: jest.fn(), findFirst: jest.fn() },
    invoice: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const mockRecomputeProject = jest.fn();
const mockGetCloseoutBlockers = jest.fn();

jest.mock("../ProjectMaterialMetricsService", () => ({
  ProjectMaterialMetricsService: jest.fn().mockImplementation(() => ({
    recomputeProject: (...args: unknown[]) => mockRecomputeProject(...args),
    getCloseoutBlockers: (...args: unknown[]) => mockGetCloseoutBlockers(...args),
  })),
}));

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ProjectCloseoutService,
  ProjectCloseoutServiceError,
} from "../ProjectCloseoutService";

const mockPrisma = prisma as any;

const buildProject = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  Proposta: { permite: "NAO", tipoServico: "GENERAL" },
  projectPermits: [],
  projectInspections: [],
  projectPunchItems: [],
  changeOrders: [],
  Cliente: null,
  projectCloseout: null,
  ...overrides,
});

describe("ProjectCloseoutService", () => {
  let service: ProjectCloseoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectCloseoutService();

    (mockPrisma.projectCloseout.upsert as jest.Mock).mockImplementation(
      async (args: {
        where: { projectId: number };
        update?: { status?: string };
        create?: { status?: string };
      }) => ({
        id: 1,
        projectId: args.where.projectId,
        status: args.update?.status ?? args.create?.status ?? "PENDING_ITEMS",
      })
    );

    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: { projectCloseout: { upsert: typeof mockPrisma.projectCloseout.upsert } }) => unknown) =>
        callback({
          projectCloseout: {
            upsert: mockPrisma.projectCloseout.upsert,
          },
        })
    );

    (mockPrisma.closeoutTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.closeoutTemplate.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.projectCloseout.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.projectCloseout.update as jest.Mock).mockImplementation(async (args: any) => ({
      id: 1,
      projectId: args.where.projectId,
      ...args.data,
    }));

    mockRecomputeProject.mockResolvedValue({
      updatedCount: 0,
      totals: {
        plannedCost: new Prisma.Decimal(0),
        actualConsumedCost: new Prisma.Decimal(0),
        varianceCost: new Prisma.Decimal(0),
        pendingQty: new Prisma.Decimal(0),
      },
      warnings: [],
    });

    mockGetCloseoutBlockers.mockResolvedValue({
      blocking: [],
      counts: {
        flowStatusBlocking: 0,
        leftoverBlocking: 0,
        totalBlocking: 0,
      },
      totalsPendingQty: new Prisma.Decimal(0),
    });
  });

  it("lança PROJECT_NOT_FOUND quando projeto não existe", async () => {
    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.recomputeAndSyncStatus(999)).rejects.toMatchObject<
      Partial<ProjectCloseoutServiceError>
    >({
      code: "PROJECT_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("retorna PENDING_ITEMS quando gate de materiais está bloqueado", async () => {
    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(buildProject());
    mockGetCloseoutBlockers.mockResolvedValue({
      blocking: [
        {
          id: 88,
          flowStatus: "ISSUED",
          leftoverQty: new Prisma.Decimal("1.5000"),
          plannedQty: new Prisma.Decimal("10.0000"),
          issuedQty: new Prisma.Decimal("5.0000"),
          consumedQty: new Prisma.Decimal("3.5000"),
          returnedQty: new Prisma.Decimal("0.0000"),
          wasteQty: new Prisma.Decimal("0.0000"),
          damagedQty: new Prisma.Decimal("0.0000"),
          lostQty: new Prisma.Decimal("0.0000"),
        },
      ],
      counts: {
        flowStatusBlocking: 1,
        leftoverBlocking: 1,
        totalBlocking: 1,
      },
      totalsPendingQty: new Prisma.Decimal("1.5000"),
    });

    const result = await service.recomputeAndSyncStatus(10);
    const materialsGate = result.gates.find((gate) => gate.key === "materials");

    expect(result.overallStatus).toBe("PENDING_ITEMS");
    expect(materialsGate).toEqual(
      expect.objectContaining({
        key: "materials",
        state: "FAIL",
        reason: "MATERIALS_PENDING_CLOSEOUT",
        blockingCount: 1,
      })
    );
  });

  it("retorna READY quando gates obrigatórios passam incluindo materials", async () => {
    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(
      buildProject({
        Proposta: { permite: "SIM", tipoServico: "GENERAL" },
        projectPermits: [
          {
            id: 1,
            permitNumber: "P-100",
            permitType: "ELECTRICAL",
            jurisdiction: "Austin",
            status: "APPROVED",
          },
        ],
        projectInspections: [
          {
            id: 11,
            permitId: 1,
            inspectionType: "FINAL",
            status: "PASSED",
            scheduledFor: new Date("2026-02-18T10:00:00.000Z"),
            isRequired: null,
            requiredForCloseout: null,
          },
        ],
        projectPunchItems: [
          {
            id: 120,
            status: "VERIFIED",
            priority: "HIGH",
            description: "acabamento",
            dueDate: null,
            assignedToWorkerId: null,
          },
        ],
      })
    );

    const result = await service.recomputeAndSyncStatus(10);

    expect(result.overallStatus).toBe("READY");
    expect(result.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "permits_inspections", state: "PASS" }),
        expect.objectContaining({ key: "punch_list", state: "PASS" }),
        expect.objectContaining({ key: "change_orders", state: "PASS" }),
        expect.objectContaining({ key: "materials", state: "PASS" }),
      ])
    );
  });

  it("generateCloseout lança CLOSEOUT_NOT_READY com failingGates", async () => {
    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(buildProject());
    mockGetCloseoutBlockers.mockResolvedValue({
      blocking: [
        {
          id: 91,
          flowStatus: "RETURN_PENDING",
          leftoverQty: new Prisma.Decimal("0.5000"),
          plannedQty: new Prisma.Decimal("10.0000"),
          issuedQty: new Prisma.Decimal("5.0000"),
          consumedQty: new Prisma.Decimal("4.0000"),
          returnedQty: new Prisma.Decimal("0.5000"),
          wasteQty: new Prisma.Decimal("0.0000"),
          damagedQty: new Prisma.Decimal("0.0000"),
          lostQty: new Prisma.Decimal("0.0000"),
        },
      ],
      counts: {
        flowStatusBlocking: 1,
        leftoverBlocking: 1,
        totalBlocking: 1,
      },
      totalsPendingQty: new Prisma.Decimal("0.5000"),
    });

    await expect(
      service.generateCloseout(10, { id: 1, nomeCompleto: "QA", email: "qa@test.local" })
    ).rejects.toMatchObject({
      code: "CLOSEOUT_NOT_READY",
      statusCode: 409,
    });
  });
});
