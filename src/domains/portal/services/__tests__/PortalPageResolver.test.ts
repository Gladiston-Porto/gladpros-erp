import { resolvePortalView } from "../PortalPageResolver";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";
import { __resetRateLimitStoreForTests } from "@/domains/portal/security/rate-limit";

describe("PortalPageResolver", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
    jest.restoreAllMocks();
  });

  it("retorna projeto quando token é válido", async () => {
    jest
      .spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken")
      .mockResolvedValue({
        id: 1,
        numeroProjeto: "PRJ-100",
        titulo: "Portal Project",
        status: "em_andamento",
        dataInicioPrevista: null,
        dataConclusaoPrevista: null,
        dataInicioReal: null,
        dataConclusaoReal: null,
        completionPercent: 50,
        etapas: [],
      });

    const result = await resolvePortalView("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", "127.0.0.1");

    expect(result).toEqual(
      expect.objectContaining({
        project: expect.objectContaining({
          id: 1,
          numeroProjeto: "PRJ-100",
        }),
      })
    );
  });

  it("retorna null para token inválido", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue(null);

    const result = await resolvePortalView("token-invalido", "127.0.0.2");

    expect(result).toBeNull();
  });

  it("retorna null para token revogado", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue(null);

    const result = await resolvePortalView("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", "127.0.0.3");

    expect(result).toBeNull();
  });

  it("retorna null quando rate limit estoura", async () => {
    const spy = jest
      .spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken")
      .mockResolvedValue({
        id: 2,
        numeroProjeto: "PRJ-200",
        titulo: "Projeto Limitado",
        status: "planejado",
        dataInicioPrevista: null,
        dataConclusaoPrevista: null,
        dataInicioReal: null,
        dataConclusaoReal: null,
        completionPercent: 0,
        etapas: [],
      });

    const ip = "127.0.0.10";
    const token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA";

    for (let i = 0; i < 10; i++) {
      const allowed = await resolvePortalView(token, ip);
      expect(allowed).not.toBeNull();
    }

    const blocked = await resolvePortalView(token, ip);
    expect(blocked).toBeNull();
    expect(spy).toHaveBeenCalledTimes(10);
  });
});
