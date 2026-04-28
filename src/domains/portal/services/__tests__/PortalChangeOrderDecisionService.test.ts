import { prisma } from "@/lib/prisma";
import { PortalTokenService } from "@/domains/projects/services/PortalTokenService";
import { PortalChangeOrderDecisionService } from "../PortalChangeOrderDecisionService";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    changeOrder: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

describe("PortalChangeOrderDecisionService", () => {
  let service: PortalChangeOrderDecisionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PortalChangeOrderDecisionService();
  });

  it("approve válido", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 99,
      numeroProjeto: "PRJ-99",
      titulo: "Projeto",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.changeOrder.findFirst.mockResolvedValue({ id: 123, status: "SENT" });
    mockPrisma.changeOrder.update.mockResolvedValue({ id: 123, status: "APPROVED" });

    const result = await service.decideByToken({
      token: "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      changeOrderId: 123,
      action: "approve",
      name: "Cliente Teste",
      ip: "127.0.0.1",
      userAgent: "jest-agent",
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "approved",
        decidedBy: "Cliente Teste",
      })
    );

    expect(mockPrisma.changeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 123 },
        data: expect.objectContaining({
          status: "APPROVED",
          approvedByName: "Cliente Teste",
          approvedIp: "127.0.0.1",
          approvedUserAgent: "jest-agent",
        }),
      })
    );
  });

  it("reject válido", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 99,
      numeroProjeto: "PRJ-99",
      titulo: "Projeto",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.changeOrder.findFirst.mockResolvedValue({ id: 124, status: "SENT" });
    mockPrisma.changeOrder.update.mockResolvedValue({ id: 124, status: "REJECTED" });

    const result = await service.decideByToken({
      token: "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      changeOrderId: 124,
      action: "reject",
      name: "Cliente Teste",
      ip: "127.0.0.1",
      userAgent: "jest-agent",
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        decidedBy: "Cliente Teste",
      })
    );

    expect(mockPrisma.changeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 124 },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectedByName: "Cliente Teste",
          rejectedIp: "127.0.0.1",
          rejectedUserAgent: "jest-agent",
        }),
      })
    );
  });

  it("token inválido retorna null", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue(null);

    const result = await service.decideByToken({
      token: "token-invalido",
      changeOrderId: 100,
      action: "approve",
      name: "Cliente",
      ip: "127.0.0.1",
      userAgent: "jest-agent",
    });

    expect(result).toBeNull();
    expect(mockPrisma.changeOrder.findFirst).not.toHaveBeenCalled();
  });

  it("CO fora do projeto retorna null", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 99,
      numeroProjeto: "PRJ-99",
      titulo: "Projeto",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.changeOrder.findFirst.mockResolvedValue(null);

    const result = await service.decideByToken({
      token: "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      changeOrderId: 200,
      action: "approve",
      name: "Cliente",
      ip: "127.0.0.1",
      userAgent: "jest-agent",
    });

    expect(result).toBeNull();
  });

  it("CO já decidido retorna null", async () => {
    jest.spyOn(PortalTokenService.prototype, "resolveSafeProjectByToken").mockResolvedValue({
      id: 99,
      numeroProjeto: "PRJ-99",
      titulo: "Projeto",
      status: "em_andamento",
      dataInicioPrevista: null,
      dataConclusaoPrevista: null,
      dataInicioReal: null,
      dataConclusaoReal: null,
      completionPercent: 0,
      etapas: [],
    });

    mockPrisma.changeOrder.findFirst.mockResolvedValue({ id: 300, status: "APPROVED" });

    const result = await service.decideByToken({
      token: "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA",
      changeOrderId: 300,
      action: "reject",
      name: "Cliente",
      ip: "127.0.0.1",
      userAgent: "jest-agent",
    });

    expect(result).toBeNull();
    expect(mockPrisma.changeOrder.update).not.toHaveBeenCalled();
  });
});
