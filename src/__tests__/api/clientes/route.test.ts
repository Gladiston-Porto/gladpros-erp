/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/shared/lib/rbac", () => ({
  requireClientePermission: jest.fn().mockResolvedValue({
    id: "1",
    role: "ADMIN",
    email: "admin@test.com",
    name: "Admin User",
  }),
}));

jest.mock("@/shared/lib/rate-limit", () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({
      allowed: true,
      message: "",
      remaining: 99,
      resetTime: 0,
    }),
  },
}));

jest.mock("@/shared/lib/helpers/cliente", () => ({
  sanitizeClienteInput: jest.fn((data) => data),
  encryptClienteData: jest.fn().mockResolvedValue({
    documentoEnc: "encrypted-doc",
    docLast4: "1234",
    docHash: "doc-hash",
  }),
  checkDocumentoExists: jest.fn().mockResolvedValue(false),
  logClienteAudit: jest.fn().mockResolvedValue(undefined),
  maskDocumento: jest.fn().mockReturnValue("***-**-1234"),
  formatTelefone: jest.fn().mockReturnValue("(469) 555-0100"),
}));

import { GET, POST } from "@/app/api/clientes/route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as {
  cliente: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
  };
};

describe("/api/clientes - GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns paginated clientes with success envelope", async () => {
    mockPrisma.cliente.findMany.mockResolvedValue([
      {
        id: 1,
        tipo: "PF",
        nomeCompleto: "João Silva",
        razaoSocial: null,
        nomeFantasia: null,
        email: "joao@email.com",
        telefone: "4695550100",
        endereco: null,
        addressStreet: "Main St 100",
        addressUnit: null,
        addressCity: "Dallas",
        addressState: "TX",
        addressZip: "75201",
        addressCounty: "Dallas County",
        docLast4: "1234",
        status: "ATIVO",
        criadoEm: new Date("2026-01-15T12:00:00.000Z"),
        atualizadoEm: new Date("2026-02-15T12:00:00.000Z"),
      },
    ]);
    mockPrisma.cliente.count.mockResolvedValue(1);

    const request = new NextRequest(
      "http://localhost/api/clientes?page=2&pageSize=10&sortKey=nome&sortDir=asc"
    );
    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveLength(1);
    expect(responseData.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ status: "desc" }, { nomeChave: "asc" }],
        skip: 10,
        take: 10,
      })
    );
  });
});

describe("/api/clientes - POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new cliente with wrapped response", async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue(null);
    mockPrisma.cliente.create.mockResolvedValue({
      id: 10,
      tipo: "PF",
      nomeCompleto: "João Silva",
      razaoSocial: null,
      nomeFantasia: null,
      email: "joao@email.com",
      telefone: "4695550100",
      endereco: null,
      addressStreet: "Main St 100",
      addressUnit: null,
      addressCity: "Dallas",
      addressState: "TX",
      addressZip: "75201",
      addressCounty: "Dallas County",
      docLast4: "1234",
      status: "ATIVO",
      criadoEm: new Date("2026-01-15T12:00:00.000Z"),
      atualizadoEm: new Date("2026-02-15T12:00:00.000Z"),
    });

    const request = new NextRequest("http://localhost/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "PF",
        nomeCompleto: "João Silva",
        email: "joao@email.com",
        telefone: "(469) 555-0100",
        tipoDocumentoPF: "SSN",
        ssn: "123-45-6789",
        addressStreet: "Main St 100",
        addressCity: "Dallas",
        addressState: "TX",
        addressZip: "75201",
      }),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toMatchObject({
      id: 10,
      nomeCompletoOuRazao: "João Silva",
      ativo: true,
    });
  });

  it("returns 409 when email is already active", async () => {
    mockPrisma.cliente.findFirst.mockResolvedValue({
      id: 11,
      status: "ATIVO",
      tipo: "PF",
    });

    const request = new NextRequest("http://localhost/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "PF",
        nomeCompleto: "João Silva",
        email: "joao@email.com",
        telefone: "(469) 555-0100",
        addressStreet: "Main St 100",
        addressCity: "Dallas",
        addressState: "TX",
        addressZip: "75201",
      }),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData).toMatchObject({
      error: "Conflict",
      message: "E-mail já cadastrado no sistema",
      success: false,
    });
  });
});
