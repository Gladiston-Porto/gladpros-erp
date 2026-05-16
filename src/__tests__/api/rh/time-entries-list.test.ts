/**
 * Unit tests: GET /api/rh/time-entries (list)
 * Covers: pagination, status filter, date filter, worker isolation, comma-separated status, RBAC
 */

import { GET } from "@/app/api/rh/time-entries/route";

jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({ url })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status ?? 200,
      json: jest.fn().mockResolvedValue(data),
      _data: data,
    })),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    worker: { findUnique: jest.fn() },
    timeEntry: { count: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock("@/shared/lib/rbac", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/shared/lib/rbac-core", () => ({
  can: jest.fn(),
}));

jest.mock("@/lib/api/error-handler", () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { can } from "@/shared/lib/rbac-core";
import { NextResponse } from "next/server";

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.Mock;
const mockWorkerFind = prisma.worker.findUnique as jest.Mock;
const mockCount = prisma.timeEntry.count as jest.Mock;
const mockFindMany = prisma.timeEntry.findMany as jest.Mock;
const mockJson = NextResponse.json as jest.Mock;

function makeRequest(url: string) {
  const { NextRequest } = jest.requireMock("next/server");
  return new NextRequest(url);
}

const USER_ADMIN = { id: 1, role: "ADMIN", empresaId: 1, email: "admin@gladpros.com" };
const USER_GERENTE = { id: 2, role: "GERENTE", empresaId: 1, email: "gerente@gladpros.com" };
const USER_WORKER = { id: 5, role: "USUARIO", empresaId: 1, email: "worker@gladpros.com" };

const MOCK_ENTRIES = [
  {
    id: 1,
    workerId: 10,
    clockIn: new Date("2026-05-12T13:00:00Z"),
    clockOut: new Date("2026-05-12T21:00:00Z"),
    status: "APPROVED",
    workLocation: "ON_SITE",
    totalMinutes: 480,
    regularMinutes: 480,
    overtimeMinutes: 0,
    activities: [],
    worker: { id: 10, name: "John Doe", compensationModel: "HOURLY", defaultHourlyRate: null },
    approvedBy: null,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  // Default: ADMIN has full access
  mockCan.mockReturnValue(true);
  mockJson.mockImplementation((data, options) => ({
    status: options?.status ?? 200,
    _data: data,
  }));
});

describe("GET /api/rh/time-entries", () => {
  describe("Paginação padrão", () => {
    it("retorna dados paginados com page=1, pageSize=20 por padrão", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCount.mockResolvedValue(1);
      mockFindMany.mockResolvedValue(MOCK_ENTRIES);

      await GET(makeRequest("http://localhost/api/rh/time-entries") as any);

      const [callData] = mockJson.mock.calls[0];
      expect(callData.success).toBe(true);
      expect(callData.data).toHaveLength(1);
      expect(callData.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("respeita page e pageSize customizados", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCount.mockResolvedValue(50);
      mockFindMany.mockResolvedValue(MOCK_ENTRIES);

      await GET(makeRequest("http://localhost/api/rh/time-entries?page=2&pageSize=10") as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 10 })
      );
    });
  });

  describe("Filtro de status", () => {
    it("filtra por status único (OPEN)", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCount.mockResolvedValue(2);
      mockFindMany.mockResolvedValue(MOCK_ENTRIES);

      await GET(makeRequest("http://localhost/api/rh/time-entries?status=OPEN") as any);

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "OPEN" }) })
      );
    });

    it("filtra por múltiplos status via comma-separated", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCount.mockResolvedValue(3);
      mockFindMany.mockResolvedValue(MOCK_ENTRIES);

      await GET(makeRequest("http://localhost/api/rh/time-entries?status=SUBMITTED,AUTO_CLOSED,CORRECTION_PENDING") as any);

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["SUBMITTED", "AUTO_CLOSED", "CORRECTION_PENDING"] },
          }),
        })
      );
    });
  });

  describe("Filtro de data", () => {
    it("aplica filtro dateFrom e dateTo corretamente", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCount.mockResolvedValue(0);
      mockFindMany.mockResolvedValue([]);

      await GET(makeRequest("http://localhost/api/rh/time-entries?dateFrom=2026-05-01&dateTo=2026-05-15") as any);

      const whereArg = mockCount.mock.calls[0][0].where;
      expect(whereArg.workDate.gte).toEqual(new Date("2026-05-01"));
      expect(whereArg.workDate.lte).toBeDefined();
    });
  });

  describe("Isolamento por role", () => {
    it("ADMIN vê todos os entries sem filtro de worker", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCan.mockReturnValue(true);
      mockCount.mockResolvedValue(5);
      mockFindMany.mockResolvedValue([]);

      await GET(makeRequest("http://localhost/api/rh/time-entries") as any);

      const whereArg = mockCount.mock.calls[0][0].where;
      expect(whereArg.workerId).toBeUndefined();
    });

    it("GERENTE vê todos os entries sem filtro de worker", async () => {
      mockRequireUser.mockResolvedValue(USER_GERENTE);
      mockCan.mockReturnValue(true);
      mockCount.mockResolvedValue(3);
      mockFindMany.mockResolvedValue([]);

      await GET(makeRequest("http://localhost/api/rh/time-entries") as any);

      const whereArg = mockCount.mock.calls[0][0].where;
      expect(whereArg.workerId).toBeUndefined();
    });

    it("USUARIO vê apenas seus próprios entries (filtra por workerId)", async () => {
      mockRequireUser.mockResolvedValue(USER_WORKER);
      mockCan.mockReturnValue(false); // USUARIO has no rh module access
      mockWorkerFind.mockResolvedValue({ id: 50 });
      mockCount.mockResolvedValue(2);
      mockFindMany.mockResolvedValue([]);

      await GET(makeRequest("http://localhost/api/rh/time-entries") as any);

      const whereArg = mockCount.mock.calls[0][0].where;
      expect(whereArg.workerId).toBe(50);
    });

    it("USUARIO sem worker vinculado vê lista vazia", async () => {
      mockRequireUser.mockResolvedValue(USER_WORKER);
      mockCan.mockReturnValue(false);
      mockWorkerFind.mockResolvedValue(null);

      await GET(makeRequest("http://localhost/api/rh/time-entries") as any);

      // Early return with empty array
      const [callData] = mockJson.mock.calls[0];
      expect(callData.success).toBe(true);
      expect(callData.data).toHaveLength(0);
    });

    it("USUARIO não pode filtrar por workerId de outro worker", async () => {
      mockRequireUser.mockResolvedValue(USER_WORKER);
      mockCan.mockReturnValue(false);
      mockWorkerFind.mockResolvedValue({ id: 50 }); // has own worker, so doesn't exit early

      await GET(makeRequest("http://localhost/api/rh/time-entries?workerId=99") as any);

      const [, callOptions] = mockJson.mock.calls[0];
      expect(callOptions?.status).toBe(403);
    });

    it("ADMIN pode filtrar por workerId específico", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCount.mockResolvedValue(1);
      mockFindMany.mockResolvedValue(MOCK_ENTRIES);

      await GET(makeRequest("http://localhost/api/rh/time-entries?workerId=10") as any);

      const whereArg = mockCount.mock.calls[0][0].where;
      expect(whereArg.workerId).toBe(10);
    });
  });

  describe("Resposta vazia", () => {
    it("retorna array vazio e pagination.total=0 quando não há entries", async () => {
      mockRequireUser.mockResolvedValue(USER_ADMIN);
      mockCount.mockResolvedValue(0);
      mockFindMany.mockResolvedValue([]);

      await GET(makeRequest("http://localhost/api/rh/time-entries") as any);

      const [callData] = mockJson.mock.calls[0];
      expect(callData.data).toHaveLength(0);
      expect(callData.pagination.total).toBe(0);
      expect(callData.pagination.totalPages).toBe(0);
    });
  });
});
