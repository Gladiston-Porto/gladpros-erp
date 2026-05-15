/**
 * Unit tests: POST /api/rh/time-entries/clock-in
 * Tests: happy path, open entry conflict, worker not found, RBAC, self-only restriction
 */

import { POST } from "@/app/api/rh/time-entries/clock-in/route";

jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn().mockResolvedValue(options?._body ?? {}),
    headers: { get: jest.fn() },
    cookies: { get: jest.fn() },
  })),
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
    projeto: { findUnique: jest.fn() },
    serviceOrder: { findUnique: jest.fn() },
    timeEntry: { findFirst: jest.fn(), create: jest.fn() },
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
const mockEntryFindFirst = prisma.timeEntry.findFirst as jest.Mock;
const mockEntryCreate = prisma.timeEntry.create as jest.Mock;
const mockJsonResponse = NextResponse.json as jest.Mock;

function makeRequest(body: object) {
  const { NextRequest } = jest.requireMock("next/server");
  const req = new NextRequest("http://localhost/api/rh/time-entries/clock-in", { _body: body });
  req.json = jest.fn().mockResolvedValue(body);
  return req;
}

const MOCK_WORKER = { id: 10, usuarioId: 1, name: "John Doe", status: "ACTIVE" };

const MOCK_ENTRY = {
  id: 1,
  workerId: 10,
  clockIn: new Date(),
  status: "OPEN",
  workLocation: "OFFICE",
  workDate: new Date(),
  activities: [{ id: 1, activityType: "ADMINISTRATIVE", durationMinutes: 0 }],
  worker: { id: 10, name: "John Doe", compensationModel: "HOURLY" },
};

const VALID_BODY = { workerId: 10, workLocation: "OFFICE", activityType: "ADMINISTRATIVE" };

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "1", email: "user@test.com", role: "USUARIO", empresaId: 1 } as never);
  mockWorkerFind.mockResolvedValue(MOCK_WORKER);
  mockEntryFindFirst.mockResolvedValue(null);
  mockEntryCreate.mockResolvedValue(MOCK_ENTRY);
  mockJsonResponse.mockImplementation((data, options) => ({
    status: options?.status ?? 200,
    json: jest.fn().mockResolvedValue(data),
  }));
});

describe("POST /api/rh/time-entries/clock-in", () => {
  it("creates a time entry successfully (happy path)", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockEntryCreate).toHaveBeenCalledTimes(1);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
      expect.objectContaining({ status: 201 })
    );
  });

  it("returns 409 when worker already has an open entry", async () => {
    mockEntryFindFirst.mockResolvedValue({ id: 99, clockIn: new Date() });
    await POST(makeRequest(VALID_BODY));
    expect(mockEntryCreate).not.toHaveBeenCalled();
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Conflict" }),
      expect.objectContaining({ status: 409 })
    );
  });

  it("returns 404 when worker does not exist", async () => {
    mockWorkerFind.mockResolvedValue(null);
    await POST(makeRequest(VALID_BODY));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 404 })
    );
  });

  it("returns 403 when worker is inactive", async () => {
    mockWorkerFind.mockResolvedValue({ ...MOCK_WORKER, status: "INACTIVE" });
    await POST(makeRequest(VALID_BODY));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 403 })
    );
  });

  it("returns 403 when USUARIO tries to clock in for another worker", async () => {
    mockWorkerFind.mockResolvedValue({ ...MOCK_WORKER, usuarioId: 99 });
    await POST(makeRequest(VALID_BODY));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 403 })
    );
  });

  it("allows ADMIN to clock in for any worker", async () => {
    mockRequireUser.mockResolvedValue({ id: "2", email: "admin@test.com", role: "ADMIN", empresaId: 1 } as never);
    mockWorkerFind.mockResolvedValue({ ...MOCK_WORKER, usuarioId: 99 });
    await POST(makeRequest(VALID_BODY));
    expect(mockEntryCreate).toHaveBeenCalledTimes(1);
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
      expect.objectContaining({ status: 201 })
    );
  });

  it("allows GERENTE to clock in for any worker", async () => {
    mockRequireUser.mockResolvedValue({ id: "3", email: "gerente@test.com", role: "GERENTE", empresaId: 1 } as never);
    mockWorkerFind.mockResolvedValue({ ...MOCK_WORKER, usuarioId: 99 });
    await POST(makeRequest(VALID_BODY));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
      expect.objectContaining({ status: 201 })
    );
  });

  it("returns 400 on invalid body", async () => {
    await POST(makeRequest({ workerId: "not-a-number" }));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Validation failed" }),
      expect.objectContaining({ status: 400 })
    );
  });

  it("returns 404 when projetoId not found", async () => {
    (prisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);
    await POST(makeRequest({ ...VALID_BODY, projetoId: 999 }));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 404 })
    );
  });
});
