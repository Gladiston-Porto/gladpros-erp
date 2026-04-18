import { __resetRateLimitStoreForTests } from "@/domains/portal/security/rate-limit";
import { PortalCloseoutService } from "@/domains/portal/services/PortalCloseoutService";
import { resolvePortalCloseoutView } from "../PortalCloseoutPageResolver";

describe("PortalCloseoutPageResolver", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
    jest.restoreAllMocks();
  });

  it("fluxo feliz retorna closeout safe", async () => {
    jest.spyOn(PortalCloseoutService.prototype, "getByToken").mockResolvedValue({
      status: "GENERATED",
      generatedAt: new Date("2026-03-10T10:00:00.000Z"),
      deliveredAt: null,
      acceptedAt: null,
      downloadAvailable: true,
    });

    const result = await resolvePortalCloseoutView(
      "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      "127.0.0.50"
    );

    expect(result).toEqual({
      closeout: expect.objectContaining({
        status: "GENERATED",
        downloadAvailable: true,
      }),
    });
  });

  it("token inválido retorna null", async () => {
    jest.spyOn(PortalCloseoutService.prototype, "getByToken").mockResolvedValue(null);

    const result = await resolvePortalCloseoutView("token-invalido", "127.0.0.51");
    expect(result).toBeNull();
  });

  it("rate-limited retorna null", async () => {
    const spy = jest.spyOn(PortalCloseoutService.prototype, "getByToken").mockResolvedValue({
      status: "PENDING_ITEMS",
      generatedAt: null,
      deliveredAt: null,
      acceptedAt: null,
      downloadAvailable: false,
    });

    const token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA";
    const ip = "127.0.0.52";

    for (let i = 0; i < 10; i++) {
      const allowed = await resolvePortalCloseoutView(token, ip);
      expect(allowed).not.toBeNull();
    }

    const blocked = await resolvePortalCloseoutView(token, ip);
    expect(blocked).toBeNull();
    expect(spy).toHaveBeenCalledTimes(10);
  });
});
