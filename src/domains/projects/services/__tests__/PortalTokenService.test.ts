import { prisma } from "@/lib/prisma";
import { PortalTokenService, PortalTokenServiceError } from "../PortalTokenService";
import { hashPortalAccessToken } from "../portal-token";

jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projeto: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

describe("PortalTokenService", () => {
  let service: PortalTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PortalTokenService();

    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({ id: 1 });
    (mockPrisma.projeto.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.projeto.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it("emite token para projeto existente com hash persistido", async () => {
    const result = await service.issueToken(1);

    expect(result.projectId).toBe(1);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.tokenHash).toHaveLength(64);
    expect(mockPrisma.projeto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          portalTokenHash: expect.any(String),
          portalTokenCreatedAt: expect.any(Date),
          portalTokenRevokedAt: null,
        }),
      })
    );
  });

  it("re-tenta emissão quando encontra colisão de hash (P2002)", async () => {
    mockPrisma.projeto.update
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce({ id: 1 });

    const result = await service.issueToken(1);

    expect(result.token).toBeTruthy();
    expect(mockPrisma.projeto.update).toHaveBeenCalledTimes(2);
  });

  it("falha com PROJECT_NOT_FOUND quando projeto não existe", async () => {
    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.issueToken(999)).rejects.toMatchObject<Partial<PortalTokenServiceError>>({
      code: "PROJECT_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("resolve projeto safe por token válido e ignora token inválido", async () => {
    (mockPrisma.projeto.findFirst as jest.Mock).mockResolvedValue({
      id: 10,
      numeroProjeto: "PRJ-001",
      titulo: "Projeto Portal",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      Etapas: [
        {
          id: 1,
          servico: "Demolição",
          status: "concluida",
          ordem: 1,
          porcentagem: 100,
          inicioPrevisto: null,
          fimPrevisto: null,
          inicioReal: null,
          fimReal: null,
        },
        {
          id: 2,
          servico: "Acabamento",
          status: "pendente",
          ordem: 2,
          porcentagem: 50,
          inicioPrevisto: null,
          fimPrevisto: null,
          inicioReal: null,
          fimReal: null,
        },
      ],
    });

    const invalid = await service.resolveSafeProjectByToken("invalid");
    expect(invalid).toBeNull();
    expect(mockPrisma.projeto.findFirst).toHaveBeenCalledTimes(0);

    const payload = await service.resolveSafeProjectByToken("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA");

    expect(payload).toMatchObject({
      id: 10,
      numeroProjeto: "PRJ-001",
      titulo: "Projeto Portal",
      completionPercent: 75,
    });
    expect(mockPrisma.projeto.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          portalTokenRevokedAt: null,
        }),
      })
    );
  });

  it("revoga token sem erro quando projeto existe mesmo sem token ativo", async () => {
    (mockPrisma.projeto.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

    await expect(service.revokeToken(1)).resolves.toBeUndefined();
  });

  it("revoga token com erro de projeto inexistente", async () => {
    (mockPrisma.projeto.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.revokeToken(321)).rejects.toMatchObject<Partial<PortalTokenServiceError>>({
      code: "PROJECT_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("usa hash gerado no lookup de token", async () => {
    const token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA";
    const expectedHash = hashPortalAccessToken(token);
    (mockPrisma.projeto.findFirst as jest.Mock).mockResolvedValue(null);

    await service.resolveSafeProjectByToken(token);

    expect(mockPrisma.projeto.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          portalTokenHash: expectedHash,
        }),
      })
    );
  });
});
