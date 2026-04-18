import { __resetRateLimitStoreForTests } from "@/domains/portal/security/rate-limit";
import { PortalInvoiceService } from "@/domains/portal/services/PortalInvoiceService";
import { resolvePortalInvoiceDetailView, resolvePortalInvoicesListView } from "../PortalInvoicesPageResolver";

describe("PortalInvoicesPageResolver", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
    jest.restoreAllMocks();
  });

  it("list view fluxo feliz", async () => {
    jest.spyOn(PortalInvoiceService.prototype, "listByToken").mockResolvedValue([
      {
        id: 1,
        invoiceNumber: "INV-2026-0001",
        status: "SENT",
        issuedAt: new Date("2026-02-22T10:00:00.000Z"),
        dueAt: new Date("2026-03-01T10:00:00.000Z"),
        currency: "USD",
        total: 1200,
        amountPaid: 300,
        balanceDue: 900,
        pdfAvailable: false,
      },
    ]);

    const result = await resolvePortalInvoicesListView("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", "127.0.0.21");

    expect(result).toEqual({
      invoices: [
        expect.objectContaining({
          id: 1,
          invoiceNumber: "INV-2026-0001",
        }),
      ],
    });
  });

  it("detail fluxo feliz", async () => {
    jest.spyOn(PortalInvoiceService.prototype, "getByToken").mockResolvedValue({
      id: 2,
      invoiceNumber: "INV-2026-0002",
      status: "PARTIAL_PAID",
      issuedAt: new Date("2026-02-22T10:00:00.000Z"),
      dueAt: new Date("2026-03-05T10:00:00.000Z"),
      currency: "USD",
      total: 2000,
      amountPaid: 500,
      balanceDue: 1500,
      pdfAvailable: false,
    });

    const result = await resolvePortalInvoiceDetailView(
      "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      2,
      "127.0.0.22"
    );

    expect(result).toEqual({
      invoice: expect.objectContaining({
        id: 2,
        invoiceNumber: "INV-2026-0002",
      }),
    });
  });

  it("token inválido retorna null (notFound neutro na page)", async () => {
    jest.spyOn(PortalInvoiceService.prototype, "listByToken").mockResolvedValue(null);

    const result = await resolvePortalInvoicesListView("token-invalido", "127.0.0.23");

    expect(result).toBeNull();
  });

  it("rate-limited retorna null", async () => {
    const spy = jest.spyOn(PortalInvoiceService.prototype, "listByToken").mockResolvedValue([]);

    const token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA";
    const ip = "127.0.0.24";

    for (let i = 0; i < 10; i++) {
      const allowed = await resolvePortalInvoicesListView(token, ip);
      expect(allowed).not.toBeNull();
    }

    const blocked = await resolvePortalInvoicesListView(token, ip);
    expect(blocked).toBeNull();
    expect(spy).toHaveBeenCalledTimes(10);
  });
});
