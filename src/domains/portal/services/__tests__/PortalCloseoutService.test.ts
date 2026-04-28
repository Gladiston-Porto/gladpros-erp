import { PortalCloseoutService } from "../PortalCloseoutService";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";

const mockFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    projectCloseout: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

jest.mock("@/domains/projects/services/PortalTokenService");

const SAFE_PROJECT = {
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
};

describe("PortalCloseoutService", () => {
  let service: PortalCloseoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    (PortalTokenService as jest.MockedClass<typeof PortalTokenService>).mockImplementation(
      () =>
        ({
          resolveSafeProjectByToken: jest.fn().mockResolvedValue(SAFE_PROJECT),
        }) as unknown as PortalTokenService
    );
    service = new PortalCloseoutService();
  });

  describe("getByToken", () => {
    it("token inválido retorna null", async () => {
      (PortalTokenService as jest.MockedClass<typeof PortalTokenService>).mockImplementation(
        () =>
          ({
            resolveSafeProjectByToken: jest.fn().mockResolvedValue(null),
          }) as unknown as PortalTokenService
      );
      service = new PortalCloseoutService();

      const result = await service.getByToken("token-invalido");
      expect(result).toBeNull();
    });

    it("sem closeout retorna null", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await service.getByToken("token-valido");
      expect(result).toBeNull();
    });

    it("closeout sem documentUrl → downloadAvailable false", async () => {
      mockFindUnique.mockResolvedValue({
        status: "PENDING_ITEMS",
        generatedAt: null,
        deliveredAt: null,
        clientAcceptedAt: null,
        documentUrl: null,
      });

      const result = await service.getByToken("token-valido");

      expect(result).toEqual({
        status: "PENDING_ITEMS",
        generatedAt: null,
        deliveredAt: null,
        acceptedAt: null,
        downloadAvailable: false,
      });
    });

    it("closeout com documentUrl → downloadAvailable true", async () => {
      const generatedAt = new Date("2026-03-10T10:00:00.000Z");
      const deliveredAt = new Date("2026-03-12T10:00:00.000Z");
      const acceptedAt = new Date("2026-03-14T10:00:00.000Z");

      mockFindUnique.mockResolvedValue({
        status: "ACCEPTED",
        generatedAt,
        deliveredAt,
        clientAcceptedAt: acceptedAt,
        documentUrl: "closeouts/42/closeout-package.pdf",
      });

      const result = await service.getByToken("token-valido");

      expect(result).toEqual({
        status: "ACCEPTED",
        generatedAt,
        deliveredAt,
        acceptedAt,
        downloadAvailable: true,
      });
    });

    it("payload safe não contém documentUrl", async () => {
      mockFindUnique.mockResolvedValue({
        status: "GENERATED",
        generatedAt: new Date(),
        deliveredAt: null,
        clientAcceptedAt: null,
        documentUrl: "closeouts/42/closeout-package.pdf",
      });

      const result = await service.getByToken("token-valido");

      expect(result).not.toHaveProperty("documentUrl");
      expect(result).not.toHaveProperty("storageKey");
      expect(result).not.toHaveProperty("path");
    });
  });

  describe("getDownloadMetaByToken", () => {
    it("token inválido retorna null", async () => {
      (PortalTokenService as jest.MockedClass<typeof PortalTokenService>).mockImplementation(
        () =>
          ({
            resolveSafeProjectByToken: jest.fn().mockResolvedValue(null),
          }) as unknown as PortalTokenService
      );
      service = new PortalCloseoutService();

      const result = await service.getDownloadMetaByToken("token-invalido");
      expect(result).toBeNull();
    });

    it("sem documentUrl retorna null", async () => {
      mockFindUnique.mockResolvedValue({ documentUrl: null });

      const result = await service.getDownloadMetaByToken("token-valido");
      expect(result).toBeNull();
    });

    it("com documentUrl retorna meta", async () => {
      mockFindUnique.mockResolvedValue({ documentUrl: "closeouts/42/closeout-package.pdf" });

      const result = await service.getDownloadMetaByToken("token-valido");
      expect(result).toEqual({ documentUrl: "closeouts/42/closeout-package.pdf" });
    });
  });
});
