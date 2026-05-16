/**
 * Unit tests: GET /api/rh/time-entries/current
 * Covers: open entry, no entry, user without worker, ADMIN workerId param, RBAC
 */

import { GET } from "@/app/api/rh/time-entries/current/route";

jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({ url })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status ?? 200,
      json: jest.fn().mockResolvedValue(data),
    })),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    worker: { findUnique: jest.fn() },
    timeEntry: { findFirst: jest.fn() },
  },
}));

jest.mock("@/shared/lib/rbac", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/api/error-handler", () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/shared/lib/rbac";
import { NextResponse } from "next/server";

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockWorkerFind = prisma.worker.findUnique as jest.Mock;
const mockEntryFind = prisma.timeEntry.findFirst as jest.Mock;
const mockJson = NextResponse.json as jest.Mock;

function makeRequest(url: string) {
  const { NextRequest } = jest.requireMock("next/server");
  return new NextRequest(url);
}

const MOCK_USER_WORKER = { id: 1, role: "USUARIO", empresaId: 1, email: "worker@gladpros.com" };
const MOCK_USER_ADMIN = { id: 2, role: "ADMIN", empresaId: 1, email: "admin@gladpros.com" };
const MOCK_USER_GERENTE = { id: 3, role: "GERENTE", empresaId: 1, email: "gerente@gladpros.com" };

const MOCK_WORKER = { id: 10 };

const MOCK_OPEN_ENTRY = {
  id: 1,
  workerId: 10,
  clockIn: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
  clockOut: null,
  status: "OPEN",
  workLocation: "ON_SITE",
  activities: [],
  worker: { id: 10, name: "John Doe", compensationModel: "HOURLY" },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockJson.mockImplementation((data, options) => ({
    status: options?.status ?? 200,
    json: jest.fn().mockResolvedValue(data),
    _data: data,
  }));
});

describe("GET /api/rh/time-entries/current", () => {
  describe("Worker sem turno aberto", () => {
    it("retorna null quando worker não tem turno aberto", async () => {
      mockRequireUser.mockResolvedValue(MOCK_USER_WORKER);
      mockWorkerFind.mockResolvedValue(MOCK_WORKER);
      mockEntryFind.mockResolvedValue(null);

      const req = makeRequest("http://localhost/api/rh/time-entries/current");
      await GET(req as any);

      const [callData] = mockJson.mock.calls[0];
      expect(callData.success).toBe(true);
      expect(callData.data).toBeNull();
    });
  });

  describe("Worker com turno aberto", () => {
    it("retorna o turno aberto com campos elapsed calculados", async () => {
      mockRequireUser.mockResolvedValue(MOCK_USER_WORKER);
      mockWorkerFind.mockResolvedValue(MOCK_WORKER);
      mockEntryFind.mockResolvedValue(MOCK_OPEN_ENTRY);

      const req = makeRequest("http://localhost/api/rh/time-entries/current");
      await GET(req as any);

      const [callData] = mockJson.mock.calls[0];
      expect(callData.success).toBe(true);
      expect(callData.data).not.toBeNull();
      expect(callData.data.id).toBe(1);
      expect(callData.data.elapsed).toBeDefined();
      expect(callData.data.elapsed.minutes).toBeGreaterThan(100); // ~120 min
      expect(callData.data.elapsed.isOvertime).toBe(false); // 2h < 8h
    });

    it("detecta overtime quando turno tem mais de 8h", async () => {
      const longEntry = {
        ...MOCK_OPEN_ENTRY,
        clockIn: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9h ago
      };
      mockRequireUser.mockResolvedValue(MOCK_USER_WORKER);
      mockWorkerFind.mockResolvedValue(MOCK_WORKER);
      mockEntryFind.mockResolvedValue(longEntry);

      const req = makeRequest("http://localhost/api/rh/time-entries/current");
      await GET(req as any);

      const [callData] = mockJson.mock.calls[0];
      expect(callData.data.elapsed.isOvertime).toBe(true);
      expect(callData.data.elapsed.minutes).toBeGreaterThan(480);
    });
  });

  describe("Usuário sem Worker vinculado", () => {
    it("retorna null sem erro quando usuário não tem worker", async () => {
      mockRequireUser.mockResolvedValue(MOCK_USER_WORKER);
      mockWorkerFind.mockResolvedValue(null);

      const req = makeRequest("http://localhost/api/rh/time-entries/current");
      await GET(req as any);

      const [callData, callOptions] = mockJson.mock.calls[0];
      expect(callData.success).toBe(true);
      expect(callData.data).toBeNull();
      expect(callOptions?.status ?? 200).toBe(200);
    });
  });

  describe("ADMIN consultando outro worker via workerId param", () => {
    it("ADMIN pode consultar turno de outro worker com workerId", async () => {
      mockRequireUser.mockResolvedValue(MOCK_USER_ADMIN);
      mockEntryFind.mockResolvedValue({ ...MOCK_OPEN_ENTRY, workerId: 20 });

      const req = makeRequest("http://localhost/api/rh/time-entries/current?workerId=20");
      await GET(req as any);

      const [callData] = mockJson.mock.calls[0];
      expect(callData.success).toBe(true);
      // Worker lookup should NOT be called — workerId came from param
      expect(mockWorkerFind).not.toHaveBeenCalled();
    });

    it("GERENTE pode consultar turno de outro worker", async () => {
      mockRequireUser.mockResolvedValue(MOCK_USER_GERENTE);
      mockEntryFind.mockResolvedValue(null);

      const req = makeRequest("http://localhost/api/rh/time-entries/current?workerId=20");
      await GET(req as any);

      const [callData] = mockJson.mock.calls[0];
      expect(callData.success).toBe(true);
    });

    it("USUARIO não pode consultar turno de outro worker", async () => {
      mockRequireUser.mockResolvedValue(MOCK_USER_WORKER);

      const req = makeRequest("http://localhost/api/rh/time-entries/current?workerId=20");
      await GET(req as any);

      const [, callOptions] = mockJson.mock.calls[0];
      expect(callOptions?.status).toBe(403);
    });

    it("retorna 400 se workerId param é inválido", async () => {
      mockRequireUser.mockResolvedValue(MOCK_USER_ADMIN);

      const req = makeRequest("http://localhost/api/rh/time-entries/current?workerId=abc");
      await GET(req as any);

      const [, callOptions] = mockJson.mock.calls[0];
      expect(callOptions?.status).toBe(400);
    });
  });
});
