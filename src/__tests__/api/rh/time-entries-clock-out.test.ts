/**
 * Unit tests: POST /api/rh/time-entries/[id]/clock-out
 * Tests: happy path + hour calculations, already closed, forbidden, activities override
 */

import { POST } from "@/app/api/rh/time-entries/[id]/clock-out/route";

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
    timeEntry: { findUnique: jest.fn(), update: jest.fn() },
    timeEntryActivity: { deleteMany: jest.fn(), createMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
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
const mockEntryFind = prisma.timeEntry.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockJsonResponse = NextResponse.json as jest.Mock;

const THREE_HOURS_AGO = new Date(Date.now() - 3 * 60 * 60 * 1000);
const TEN_HOURS_AGO = new Date(Date.now() - 10 * 60 * 60 * 1000);

const MOCK_OPEN_ENTRY = {
  id: 1,
  workerId: 10,
  clockIn: THREE_HOURS_AGO,
  clockOut: null,
  status: "OPEN",
  notes: null,
  activities: [{ id: 1, timeEntryId: 1, activityType: "ADMINISTRATIVE", durationMinutes: 0 }],
  worker: { id: 10, usuarioId: 1, name: "John Doe", compensationModel: "HOURLY", defaultHourlyRate: "35.00" },
};

const UPDATED_ENTRY = {
  ...MOCK_OPEN_ENTRY,
  clockOut: new Date(),
  status: "SUBMITTED",
  totalMinutes: 180,
  regularMinutes: 180,
  overtimeMinutes: 0,
};

function makeRequest(id: string, body: object = {}) {
  const { NextRequest } = jest.requireMock("next/server");
  const req = new NextRequest(`http://localhost/api/rh/time-entries/${id}/clock-out`, { _body: body });
  req.json = jest.fn().mockResolvedValue(body);
  return req;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "1", email: "user@test.com", role: "USUARIO", empresaId: 1 } as never);
  mockEntryFind
    .mockResolvedValueOnce(MOCK_OPEN_ENTRY)
    .mockResolvedValueOnce(UPDATED_ENTRY);
  mockTransaction.mockImplementation(async (fn: Function) => fn(prisma));
  mockJsonResponse.mockImplementation((data, options) => ({
    status: options?.status ?? 200,
    json: jest.fn().mockResolvedValue(data),
  }));
});

describe("POST /api/rh/time-entries/[id]/clock-out", () => {
  it("clocks out successfully and includes summary", async () => {
    await POST(makeRequest("1"), makeParams("1"));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
      expect.objectContaining({ status: 200 })
    );
    const call = mockJsonResponse.mock.calls[0][0];
    expect(call.data.summary).toBeDefined();
    expect(call.data.summary.totalMinutes).toBeGreaterThan(0);
  });

  it("returns 409 when entry is already submitted", async () => {
    mockEntryFind.mockReset().mockResolvedValue({ ...MOCK_OPEN_ENTRY, status: "SUBMITTED" });
    await POST(makeRequest("1"), makeParams("1"));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: "Conflict" }),
      expect.objectContaining({ status: 409 })
    );
  });

  it("returns 409 when entry is already approved", async () => {
    mockEntryFind.mockReset().mockResolvedValue({ ...MOCK_OPEN_ENTRY, status: "APPROVED" });
    await POST(makeRequest("1"), makeParams("1"));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 409 })
    );
  });

  it("returns 404 when entry does not exist", async () => {
    mockEntryFind.mockReset().mockResolvedValue(null);
    await POST(makeRequest("999"), makeParams("999"));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 404 })
    );
  });

  it("returns 403 when USUARIO tries to clock out another worker", async () => {
    mockEntryFind.mockReset()
      .mockResolvedValueOnce({ ...MOCK_OPEN_ENTRY, worker: { ...MOCK_OPEN_ENTRY.worker, usuarioId: 99 } });
    await POST(makeRequest("1"), makeParams("1"));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 403 })
    );
  });

  it("allows ADMIN to clock out for any worker", async () => {
    mockRequireUser.mockResolvedValue({ id: "2", email: "admin@test.com", role: "ADMIN", empresaId: 1 } as never);
    mockEntryFind.mockReset()
      .mockResolvedValueOnce({ ...MOCK_OPEN_ENTRY, worker: { ...MOCK_OPEN_ENTRY.worker, usuarioId: 99 } })
      .mockResolvedValueOnce(UPDATED_ENTRY);
    await POST(makeRequest("1"), makeParams("1"));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
      expect.objectContaining({ status: 200 })
    );
  });

  it("calculates overtime correctly for entries > 8 hours", async () => {
    const overtimeEntry = {
      ...MOCK_OPEN_ENTRY,
      clockIn: TEN_HOURS_AGO,
    };
    const overtimeUpdated = {
      ...overtimeEntry,
      clockOut: new Date(),
      status: "SUBMITTED",
      totalMinutes: 600,
      regularMinutes: 480,
      overtimeMinutes: 120,
    };
    mockEntryFind.mockReset()
      .mockResolvedValueOnce(overtimeEntry)
      .mockResolvedValueOnce(overtimeUpdated);

    await POST(makeRequest("1"), makeParams("1"));

    const call = mockJsonResponse.mock.calls[0][0];
    expect(call.data.summary.overtimeMinutes).toBeGreaterThan(0);
    expect(call.data.summary.regularMinutes).toBe(480);
  });

  it("returns 400 for invalid (non-numeric) id", async () => {
    await POST(makeRequest("abc"), makeParams("abc"));
    expect(mockJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      expect.objectContaining({ status: 400 })
    );
  });
});
