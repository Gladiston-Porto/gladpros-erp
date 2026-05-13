/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: { findUnique: jest.fn() },
    invoice: {
      aggregate: jest.fn(),
      findFirst: jest.fn(),
    },
    projeto: { count: jest.fn() },
    serviceOrder: { count: jest.fn() },
  },
}));

jest.mock("@/shared/lib/rbac", () => ({
  requireClientePermission: jest.fn(),
}));

jest.mock("@/shared/lib/rbac-core", () => ({
  can: jest.fn(),
}));

jest.mock("@/shared/lib/helpers/cliente", () => ({
  sanitizeClienteInput: jest.fn(),
  encryptClienteData: jest.fn(),
  checkDocumentoExists: jest.fn(),
  logClienteAudit: jest.fn(),
  calculateClienteDiff: jest.fn(),
  formatTelefone: jest.fn((value) => value),
  maskDocumento: jest.fn(() => "***-**-1234"),
  validateAddressIntegrity: jest.fn(),
  getClientesBlockingDependenciesMap: jest.fn(),
  hasBlockingDependencies: jest.fn(),
  buildClienteDependencyConflictDetails: jest.fn(),
}));

import { GET } from "@/app/api/clientes/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireClientePermission } from "@/shared/lib/rbac";
import { can } from "@/shared/lib/rbac-core";

const mockPrisma = prisma as {
  cliente: { findUnique: jest.Mock };
  invoice: { aggregate: jest.Mock; findFirst: jest.Mock };
  projeto: { count: jest.Mock };
  serviceOrder: { count: jest.Mock };
};

describe("/api/clientes/[id] - GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.cliente.findUnique.mockResolvedValue({
      id: 7,
      tipo: "PF",
      nomeCompleto: "John Doe",
      razaoSocial: null,
      nomeFantasia: null,
      email: "john@example.com",
      telefone: "(469) 555-0100",
      nomeChave: "john-doe",
      endereco: null,
      addressStreet: "Main St 100",
      addressUnit: null,
      addressCity: "Dallas",
      addressState: "TX",
      addressZip: "75201",
      addressCounty: "Dallas County",
      status: "ATIVO",
      documentoEnc: "enc",
      docLast4: "1234",
      observacoes: null,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
      atualizadoEm: new Date("2026-01-02T00:00:00.000Z"),
    });
    mockPrisma.projeto.count.mockResolvedValue(2);
    mockPrisma.serviceOrder.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    mockPrisma.invoice.aggregate
      .mockResolvedValueOnce({ _count: { id: 4 }, _sum: { valorTotal: 1000 } })
      .mockResolvedValueOnce({ _count: { id: 2 }, _sum: { valorTotal: 250 } });
    mockPrisma.invoice.findFirst.mockResolvedValue({
      dataEmissao: new Date("2026-01-10T00:00:00.000Z"),
    });
  });

  it("oculta métricas financeiras para role sem acesso a invoices/financeiro", async () => {
    (requireClientePermission as jest.Mock).mockResolvedValue({ id: "9", role: "ESTOQUE" });
    (can as jest.Mock).mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/clientes/7");
    const response = await GET(request, { params: Promise.resolve({ id: "7" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.metrics).toMatchObject({
      canViewFinancial: false,
      projetosCount: 2,
      serviceOrdersCount: 3,
      completedServiceOrdersCount: 1,
      lastInvoiceAt: null,
    });
    expect(payload.data.metrics.lifetimeValue).toBeUndefined();
    expect(mockPrisma.invoice.aggregate).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findFirst).not.toHaveBeenCalled();
  });

  it("usa endereco legado como fallback para registros antigos", async () => {
    mockPrisma.cliente.findUnique.mockResolvedValueOnce({
      id: 8,
      tipo: "PF",
      nomeCompleto: "Legacy Client",
      razaoSocial: null,
      nomeFantasia: null,
      email: "legacy@example.com",
      telefone: "(469) 555-0101",
      nomeChave: "legacy-client",
      endereco: {
        rua: "Old Main St 10",
        cidade: "Irving",
        estado: "TX",
        zipcode: "75039",
      },
      addressStreet: null,
      addressUnit: null,
      addressCity: null,
      addressState: null,
      addressZip: null,
      addressCounty: null,
      status: "ATIVO",
      documentoEnc: "enc",
      docLast4: "1234",
      observacoes: null,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
      atualizadoEm: new Date("2026-01-02T00:00:00.000Z"),
    });
    (requireClientePermission as jest.Mock).mockResolvedValue({ id: "1", role: "ADMIN" });
    (can as jest.Mock).mockReturnValue(true);

    const response = await GET(new NextRequest("http://localhost/api/clientes/8"), { params: Promise.resolve({ id: "8" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      addressStreet: "Old Main St 10",
      addressCity: "Irving",
      addressState: "TX",
      addressZip: "75039",
      cidade: "Irving",
      estado: "TX",
      zipcode: "75039",
    });
  });
});
