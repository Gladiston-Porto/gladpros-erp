/** @jest-environment node */

export {};

import { __resetRateLimitStoreForTests } from "@/domains/portal/security/rate-limit";

const mockResolveSafeProjectByToken = jest.fn();
const mockFindFirst = jest.fn();
const mockGetPdfBufferByStorageKey = jest.fn();
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
    invoice: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

jest.mock("@/domains/projects/services/PortalTokenService", () => ({
  PortalTokenService: jest.fn().mockImplementation(() => ({
    resolveSafeProjectByToken: (...args: unknown[]) => mockResolveSafeProjectByToken(...args),
  })),
}));

jest.mock("@/domains/portal/services/PortalInvoicePdfStorageService", () => ({
  PortalInvoicePdfStorageService: jest.fn().mockImplementation(() => ({
    getPdfBufferByStorageKey: (...args: unknown[]) => mockGetPdfBufferByStorageKey(...args),
  })),
}));

const { GET } = require("../route");

function makeContext(token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", id = "10") {
  return { params: Promise.resolve({ token, id }) } as {
    params: Promise<{ token: string; id: string }>;
  };
}

describe("GET /portal/[token]/invoices/[id]/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRateLimitStoreForTests();
    currentHeaders = {
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "jest-route-agent",
    };

    mockResolveSafeProjectByToken.mockResolvedValue({
      id: 91,
      numeroProjeto: "PRJ-91",
      titulo: "Projeto 91",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });
  });

  it("id inválido retorna 404 neutro", async () => {
    const response = await GET({} as Request, makeContext("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", "abc"));

    expect(response.status).toBe(404);
  });

  it("rate limit excedido retorna 404 neutro", async () => {
    mockFindFirst.mockResolvedValue({
      pdfStorageKey: "invoices/2026/INV-2026-0001.pdf",
      pdfMimeType: "application/pdf",
      pdfFileName: "INV-2026-0001.pdf",
      pdfSizeBytes: 4,
      pdfGeneratedAt: new Date("2026-02-23T10:00:00.000Z"),
    });
    mockGetPdfBufferByStorageKey.mockResolvedValue(Buffer.from("%PDF"));

    for (let i = 0; i < 10; i++) {
      const allowed = await GET({} as Request, makeContext());
      expect(allowed.status).toBe(200);
    }

    const blocked = await GET({} as Request, makeContext());
    expect(blocked.status).toBe(404);
  });

  it("invoice sem pdfStorageKey retorna 404 neutro", async () => {
    mockFindFirst.mockResolvedValue({
      pdfStorageKey: null,
      pdfMimeType: null,
      pdfFileName: null,
      pdfSizeBytes: null,
      pdfGeneratedAt: null,
    });

    const response = await GET({} as Request, makeContext());

    expect(response.status).toBe(404);
  });

  it("fluxo feliz retorna 200 com headers de download", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4\n");

    mockFindFirst.mockResolvedValue({
      pdfStorageKey: "invoices/2026/INV-2026-0010.pdf",
      pdfMimeType: "application/pdf",
      pdfFileName: "INV-2026-0010.pdf",
      pdfSizeBytes: pdfBuffer.byteLength,
      pdfGeneratedAt: new Date("2026-02-23T10:00:00.000Z"),
    });
    mockGetPdfBufferByStorageKey.mockResolvedValue(pdfBuffer);

    const response = await GET({} as Request, makeContext("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", "10"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="INV-2026-0010.pdf"');
  });
});
