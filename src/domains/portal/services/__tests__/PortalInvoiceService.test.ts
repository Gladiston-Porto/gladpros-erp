import { prisma } from "@/lib/prisma";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";
import { PortalInvoiceService } from "../PortalInvoiceService";

jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    invoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

describe("PortalInvoiceService", () => {
  let service: PortalInvoiceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PortalInvoiceService();
  });

  it("token inválido retorna null no detalhe e null na lista", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue(null);

    const listResult = await service.listByToken("token-invalido");
    const detailResult = await service.getByToken("token-invalido", 10);

    expect(listResult).toBeNull();
    expect(detailResult).toBeNull();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findFirst).not.toHaveBeenCalled();
  });

  it("invoice fora do projeto retorna null no detalhe", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 55,
      numeroProjeto: "PRJ-55",
      titulo: "Projeto 55",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    const result = await service.getByToken("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", 999);

    expect(result).toBeNull();
    expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 999,
          projetoId: 55,
        },
      })
    );
  });

  it("payload safe não expõe campos proibidos", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 77,
      numeroProjeto: "PRJ-77",
      titulo: "Projeto Portal",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: 10,
        numeroInvoice: "INV-2026-0001",
        status: "SENT",
        dataEmissao: new Date("2026-02-22T10:00:00.000Z"),
        dataVencimento: new Date("2026-03-01T10:00:00.000Z"),
        valorTotal: "1500.00",
        valorPago: "500.00",
        saldo: "1000.00",
        pdfStorageKey: null,
      },
    ]);

    const result = await service.listByToken("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA");

    expect(result).toEqual([
      {
        id: 10,
        invoiceNumber: "INV-2026-0001",
        status: "SENT",
        issuedAt: new Date("2026-02-22T10:00:00.000Z"),
        dueAt: new Date("2026-03-01T10:00:00.000Z"),
        currency: "USD",
        total: 1500,
        amountPaid: 500,
        balanceDue: 1000,
        pdfAvailable: false,
      },
    ]);

    const keys = Object.keys(result?.[0] ?? {});
    expect(keys).toEqual([
      "id",
      "invoiceNumber",
      "status",
      "issuedAt",
      "dueAt",
      "currency",
      "total",
      "amountPaid",
      "balanceDue",
      "pdfAvailable",
    ]);

    expect(result?.[0]).not.toHaveProperty("criadoPor");
    expect(result?.[0]).not.toHaveProperty("notas");
    expect(result?.[0]).not.toHaveProperty("itens");
    expect(result?.[0]).not.toHaveProperty("gatewayTransactionId");
  });

  it("detalhe retorna payload safe com pdfAvailable refletindo estado atual", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
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

    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: 33,
      numeroInvoice: "INV-2026-0033",
      status: "PARTIAL_PAID",
      dataEmissao: new Date("2026-02-20T10:00:00.000Z"),
      dataVencimento: new Date("2026-03-10T10:00:00.000Z"),
      valorTotal: "2200.00",
      valorPago: "700.00",
      saldo: "1500.00",
      pdfStorageKey: null,
    });

    const result = await service.getByToken("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", 33);

    expect(result).toEqual({
      id: 33,
      invoiceNumber: "INV-2026-0033",
      status: "PARTIAL_PAID",
      issuedAt: new Date("2026-02-20T10:00:00.000Z"),
      dueAt: new Date("2026-03-10T10:00:00.000Z"),
      currency: "USD",
      total: 2200,
      amountPaid: 700,
      balanceDue: 1500,
      pdfAvailable: false,
    });

    expect(result).not.toHaveProperty("notas");
    expect(result).not.toHaveProperty("itens");
    expect(result).not.toHaveProperty("gatewayId");
  });

  it("pdfAvailable fica true quando há metadado de PDF", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 88,
      numeroProjeto: "PRJ-88",
      titulo: "Projeto 88",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: 44,
        numeroInvoice: "INV-2026-0044",
        status: "SENT",
        dataEmissao: new Date("2026-02-21T10:00:00.000Z"),
        dataVencimento: new Date("2026-03-15T10:00:00.000Z"),
        valorTotal: "900.00",
        valorPago: "0.00",
        saldo: "900.00",
        pdfStorageKey: "invoices/2026/INV-2026-0044.pdf",
      },
    ]);

    const result = await service.listByToken("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA");

    expect(result).toEqual([
      {
        id: 44,
        invoiceNumber: "INV-2026-0044",
        status: "SENT",
        issuedAt: new Date("2026-02-21T10:00:00.000Z"),
        dueAt: new Date("2026-03-15T10:00:00.000Z"),
        currency: "USD",
        total: 900,
        amountPaid: 0,
        balanceDue: 900,
        pdfAvailable: true,
      },
    ]);

    expect(result?.[0]).not.toHaveProperty("pdfStorageKey");
  });
});
