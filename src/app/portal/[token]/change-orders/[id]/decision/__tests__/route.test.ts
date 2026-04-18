/** @jest-environment node */

export {};

import { __resetRateLimitStoreForTests } from "@/domains/portal/security/rate-limit";

const mockDecideByToken = jest.fn();
const mockNoStore = jest.fn();

let currentHeaders: Record<string, string> = {};

jest.mock("next/cache", () => ({
  unstable_noStore: () => mockNoStore(),
}));

jest.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => currentHeaders[name.toLowerCase()] ?? null,
  }),
}));

jest.mock("@/domains/portal/services/PortalChangeOrderDecisionService", () => ({
  PortalChangeOrderDecisionService: jest.fn().mockImplementation(() => ({
    decideByToken: (...args: unknown[]) => mockDecideByToken(...args),
  })),
}));

const { POST } = require("../route");

function makeContext(token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", id = "10") {
  return { params: Promise.resolve({ token, id }) } as {
    params: Promise<{ token: string; id: string }>;
  };
}

function makeJsonRequest(body: unknown) {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as any;
}

describe("POST /portal/[token]/change-orders/[id]/decision", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRateLimitStoreForTests();
    currentHeaders = {
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "jest-route-agent",
    };
  });

  it("body inválido retorna notFound neutro", async () => {
    mockDecideByToken.mockResolvedValue(null);

    const response = await POST(makeJsonRequest({ action: "APPROVE" }), makeContext());

    expect(response.status).toBe(404);
  });

  it("rate limit excedido retorna notFound neutro", async () => {
    mockDecideByToken.mockResolvedValue({
      status: "approved",
      decidedAt: new Date("2026-02-22T12:00:00.000Z"),
      decidedBy: "Cliente",
    });

    for (let i = 0; i < 10; i++) {
      const response = await POST(makeJsonRequest({ action: "APPROVE", name: "Cliente" }), makeContext());
      expect(response.status).toBe(200);
    }

    const blocked = await POST(makeJsonRequest({ action: "APPROVE", name: "Cliente" }), makeContext());
    expect(blocked.status).toBe(404);
    expect(mockDecideByToken).toHaveBeenCalledTimes(10);
  });

  it("fluxo feliz approve", async () => {
    mockDecideByToken.mockResolvedValue({
      status: "approved",
      decidedAt: new Date("2026-02-22T12:00:00.000Z"),
      decidedBy: "Cliente Portal",
    });

    const response = await POST(
      makeJsonRequest({ action: "APPROVE", name: "Cliente Portal" }),
      makeContext("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", "20")
    );

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(
      expect.objectContaining({
        status: "approved",
        decidedBy: "Cliente Portal",
      })
    );
  });

  it("fluxo feliz reject", async () => {
    mockDecideByToken.mockResolvedValue({
      status: "rejected",
      decidedAt: new Date("2026-02-22T12:00:00.000Z"),
      decidedBy: "Cliente Portal",
    });

    const response = await POST(
      makeJsonRequest({ action: "REJECT", name: "Cliente Portal" }),
      makeContext("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", "21")
    );

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(
      expect.objectContaining({
        status: "rejected",
        decidedBy: "Cliente Portal",
      })
    );
  });
});
