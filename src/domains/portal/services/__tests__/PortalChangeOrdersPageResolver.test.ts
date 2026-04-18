import { __resetRateLimitStoreForTests } from "@/domains/portal/security/rate-limit";
import { PortalChangeOrderService } from "../PortalChangeOrderService";
import {
  resolvePortalChangeOrderDetailView,
  resolvePortalChangeOrdersListView,
} from "../PortalChangeOrdersPageResolver";

describe("PortalChangeOrdersPageResolver", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
    jest.restoreAllMocks();
  });

  it("list view render ok (snapshot simples)", async () => {
    jest.spyOn(PortalChangeOrderService.prototype, "listByToken").mockResolvedValue([
      {
        id: 1,
        code: null,
        title: "Mudança de escopo de elétrica",
        status: "SENT",
        createdAt: new Date("2026-02-22T10:00:00.000Z"),
        updatedAt: new Date("2026-02-22T11:00:00.000Z"),
        summary: "Resumo curto",
      },
    ]);

    const result = await resolvePortalChangeOrdersListView(
      "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      "127.0.0.1"
    );

    expect(result).toMatchSnapshot();
  });

  it("token inválido retorna null (notFound neutro na page)", async () => {
    jest.spyOn(PortalChangeOrderService.prototype, "listByToken").mockResolvedValue(null);

    const result = await resolvePortalChangeOrdersListView("token-invalido", "127.0.0.2");

    expect(result).toBeNull();
  });

  it("rate-limited retorna null", async () => {
    const spy = jest.spyOn(PortalChangeOrderService.prototype, "listByToken").mockResolvedValue([]);

    const token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA";
    const ip = "127.0.0.3";

    for (let i = 0; i < 10; i++) {
      const allowed = await resolvePortalChangeOrdersListView(token, ip);
      expect(allowed).not.toBeNull();
    }

    const blocked = await resolvePortalChangeOrdersListView(token, ip);
    expect(blocked).toBeNull();
    expect(spy).toHaveBeenCalledTimes(10);
  });

  it("detail de CO fora do projeto retorna null (notFound neutro na page)", async () => {
    jest.spyOn(PortalChangeOrderService.prototype, "getByToken").mockResolvedValue(null);

    const result = await resolvePortalChangeOrderDetailView(
      "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      987,
      "127.0.0.4"
    );

    expect(result).toBeNull();
  });
});
