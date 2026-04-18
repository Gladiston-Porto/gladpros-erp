import { prisma } from "@/lib/prisma";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";
import { PortalChangeOrderService } from "../PortalChangeOrderService";

jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    changeOrder: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

describe("PortalChangeOrderService", () => {
  let service: PortalChangeOrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PortalChangeOrderService();
  });

  it("token válido lista somente CO do projeto resolvido", async () => {
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

    mockPrisma.changeOrder.findMany.mockResolvedValue([
      {
        id: 10,
        status: "SENT",
        description: "Mudança no escopo de acabamento com ajuste de material",
        createdAt: new Date("2026-02-22T10:00:00.000Z"),
        updatedAt: new Date("2026-02-22T11:00:00.000Z"),
      },
    ]);

    const result = await service.listByToken("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA");

    expect(mockPrisma.changeOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 77,
          jobType: "PROJECT",
        },
      })
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: 10,
        status: "SENT",
      }),
    ]);
  });

  it("token válido + id de outro projeto retorna null no detalhe", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 88,
      numeroProjeto: "PRJ-88",
      titulo: "Projeto 88",
      status: "planejado",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.changeOrder.findFirst.mockResolvedValue(null);

    const result = await service.getByToken("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA", 999);

    expect(mockPrisma.changeOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 999,
          projectId: 88,
          jobType: "PROJECT",
        }),
      })
    );
    expect(result).toBeNull();
  });
});
