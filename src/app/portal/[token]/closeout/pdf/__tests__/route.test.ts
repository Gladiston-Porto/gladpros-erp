/** @jest-environment node */

export {};

import { __resetRateLimitStoreForTests } from "@/domains/portal/security/rate-limit";

const mockResolveSafeProjectByToken = jest.fn();
const mockFindUnique = jest.fn();
const mockGetFileBuffer = jest.fn();
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

jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projectCloseout: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

jest.mock("@/domains/projects/services/PortalTokenService", () => ({
  PortalTokenService: jest.fn().mockImplementation(() => ({
    resolveSafeProjectByToken: (...args: unknown[]) => mockResolveSafeProjectByToken(...args),
  })),
}));

jest.mock("@/domains/portal/services/PortalCloseoutStorageService", () => ({
  PortalCloseoutStorageService: jest.fn().mockImplementation(() => ({
    getFileBuffer: (...args: unknown[]) => mockGetFileBuffer(...args),
  })),
}));

const { GET } = require("../route");

function makeContext(token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA") {
  return { params: Promise.resolve({ token }) } as {
    params: Promise<{ token: string }>;
  };
}

describe("GET /portal/[token]/closeout/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRateLimitStoreForTests();
    currentHeaders = {
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "jest-route-agent",
    };

    mockResolveSafeProjectByToken.mockResolvedValue({
      id: 42,
      numeroProjeto: "PRJ-42",
      titulo: "Projeto 42",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });
  });

  it("token inválido retorna 404 neutro", async () => {
    mockResolveSafeProjectByToken.mockResolvedValue(null);

    const response = await GET({} as Request, makeContext("token-invalido"));
    expect(response.status).toBe(404);
  });

  it("rate limit excedido retorna 404 neutro", async () => {
    mockFindUnique.mockResolvedValue({ documentUrl: "closeouts/42/pkg.pdf" });
    mockGetFileBuffer.mockResolvedValue(Buffer.from("%PDF"));

    for (let i = 0; i < 10; i++) {
      const allowed = await GET({} as Request, makeContext());
      expect(allowed.status).toBe(200);
    }

    const blocked = await GET({} as Request, makeContext());
    expect(blocked.status).toBe(404);
  });

  it("sem documentUrl retorna 404 neutro", async () => {
    mockFindUnique.mockResolvedValue({ documentUrl: null });

    const response = await GET({} as Request, makeContext());
    expect(response.status).toBe(404);
  });

  it("arquivo não encontrado no storage retorna 404 neutro", async () => {
    mockFindUnique.mockResolvedValue({ documentUrl: "closeouts/42/pkg.pdf" });
    mockGetFileBuffer.mockResolvedValue(null);

    const response = await GET({} as Request, makeContext());
    expect(response.status).toBe(404);
  });

  it("fluxo feliz retorna 200 com headers de download", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 closeout content");

    mockFindUnique.mockResolvedValue({ documentUrl: "closeouts/42/closeout-package.pdf" });
    mockGetFileBuffer.mockResolvedValue(pdfBuffer);

    const response = await GET({} as Request, makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("closeout-package.pdf");
    expect(response.headers.get("Content-Length")).toBe(String(pdfBuffer.byteLength));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
