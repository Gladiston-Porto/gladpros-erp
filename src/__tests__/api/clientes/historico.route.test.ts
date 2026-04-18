/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: { findUnique: jest.fn() },
    serviceOrder: { findMany: jest.fn() },
    proposta: { findMany: jest.fn() },
    projeto: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
    warrantyTicket: { findMany: jest.fn() },
    revenue: { findMany: jest.fn() },
    invoicePayment: { findMany: jest.fn() },
  },
}));

jest.mock("@/shared/lib/rbac", () => ({
  requireClientePermission: jest.fn(),
}));

jest.mock("@/shared/lib/rbac-core", () => ({
  can: jest.fn(),
}));

import { GET } from "@/app/api/clientes/[id]/historico/route";
import { prisma } from "@/lib/prisma";
import { requireClientePermission } from "@/shared/lib/rbac";
import { can } from "@/shared/lib/rbac-core";

const mockPrisma = prisma as {
  cliente: { findUnique: jest.Mock };
  serviceOrder: { findMany: jest.Mock };
  proposta: { findMany: jest.Mock };
  projeto: { findMany: jest.Mock };
  invoice: { findMany: jest.Mock };
  warrantyTicket: { findMany: jest.Mock };
  revenue: { findMany: jest.Mock };
  invoicePayment: { findMany: jest.Mock };
};

describe("/api/clientes/[id]/historico - GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 7, status: "ATIVO" });
    mockPrisma.serviceOrder.findMany.mockResolvedValue([]);
    mockPrisma.proposta.findMany.mockResolvedValue([]);
    mockPrisma.projeto.findMany.mockResolvedValue([]);
    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: 10,
        numeroInvoice: "INV-10",
        status: "PAID",
        valorTotal: 500,
        dataEmissao: new Date("2026-01-10T00:00:00.000Z"),
        dataVencimento: new Date("2026-01-20T00:00:00.000Z"),
        dataPagamento: new Date("2026-01-15T00:00:00.000Z"),
      },
    ]);
    mockPrisma.warrantyTicket.findMany.mockResolvedValue([]);
    mockPrisma.revenue.findMany.mockResolvedValue([
      {
        id: 30,
        descricao: "Receita de contrato",
        valor: 500,
        status: "RECEBIDA",
        tipo: "SERVICO",
        dataEmissao: new Date("2026-01-10T00:00:00.000Z"),
        dataVencimento: new Date("2026-01-20T00:00:00.000Z"),
        dataPagamento: new Date("2026-01-15T00:00:00.000Z"),
        categoria: { nome: "Instalação" },
      },
    ]);
    mockPrisma.invoicePayment.findMany.mockResolvedValue([
      {
        id: 40,
        invoiceId: 10,
        valor: 500,
        dataPagamento: new Date("2026-01-15T00:00:00.000Z"),
        metodoPagamento: "CARD",
        referencia: "AUTH-1",
        invoice: { numeroInvoice: "INV-10" },
      },
    ]);
  });

  it("inclui trilha financeira quando a role tem acesso", async () => {
    (requireClientePermission as jest.Mock).mockResolvedValue({ id: "1", role: "ADMIN" });
    (can as jest.Mock).mockImplementation((_role: string, moduleKey: string) => (
      moduleKey === "invoices" || moduleKey === "financeiro"
    ));

    const request = new NextRequest("http://localhost/api/clientes/7/historico");
    const response = await GET(request, { params: Promise.resolve({ id: "7" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.permissions.canViewFinancial).toBe(true);
    expect(payload.data.revenues).toHaveLength(1);
    expect(payload.data.invoicePayments).toHaveLength(1);
    expect(payload.data.totais).toMatchObject({ revenues: 1, invoicePayments: 1 });
    expect(payload.data.metrics).toMatchObject({
      totalRevenueValue: 500,
      receivedRevenueValue: 500,
      outstandingRevenueValue: 0,
      invoicePaymentsValue: 500,
    });
  });
});
