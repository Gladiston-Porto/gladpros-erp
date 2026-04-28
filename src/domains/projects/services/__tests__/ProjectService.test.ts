jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    proposta: { findUnique: jest.fn() },
    projeto: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("../ProjectNumberService");
jest.mock("../ProjectHistoryService");

const mockRecomputeProject = jest.fn();
const mockGetCloseoutBlockers = jest.fn();

jest.mock("../ProjectMaterialMetricsService", () => ({
  ProjectMaterialMetricsService: jest.fn().mockImplementation(() => ({
    recomputeProject: (...args: unknown[]) => mockRecomputeProject(...args),
    getCloseoutBlockers: (...args: unknown[]) => mockGetCloseoutBlockers(...args),
  })),
}));

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ProjectService, ProjectServiceError } from "../ProjectService";
import { ProjectNumberService } from "../ProjectNumberService";

const mockPrisma = prisma as any;

describe("ProjectService", () => {
  let service: ProjectService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectService();
    (ProjectNumberService.prototype.gerarNumeroProjeto as jest.Mock) = jest
      .fn()
      .mockResolvedValue("PRJ-2025-0001");

    mockRecomputeProject.mockResolvedValue({
      updatedCount: 0,
      totals: {
        plannedCost: new Prisma.Decimal(0),
        actualConsumedCost: new Prisma.Decimal(0),
        varianceCost: new Prisma.Decimal(0),
        pendingQty: new Prisma.Decimal(0),
      },
      warnings: [],
    });

    mockGetCloseoutBlockers.mockResolvedValue({
      blocking: [],
      counts: {
        flowStatusBlocking: 0,
        leftoverBlocking: 0,
        totalBlocking: 0,
      },
      totalsPendingQty: new Prisma.Decimal(0),
    });
  });

  describe("criar", () => {
    const createDTO = {
      titulo: "Novo Projeto",
      descricao: "Descrição do projeto",
      clienteId: 1,
      dataInicio: "2025-01-01",
      dataFimPrevista: "2025-12-31",
      orcamento: 50000,
    };

    it("deve criar projeto com sucesso", async () => {
      (mockPrisma.cliente.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projeto.create as jest.Mock).mockResolvedValue({
        id: 1,
        numeroProjeto: "PRJ-2025-0001",
        ...createDTO,
        status: "planejado",
        cliente: { id: 1, nome: "Cliente Teste" },
      } as any);

      const resultado = await service.criar(createDTO, 1);

      expect(resultado.numeroProjeto).toBe("PRJ-2025-0001");
      expect(resultado.titulo).toBe(createDTO.titulo);
    });

    it("deve rejeitar se cliente não existe", async () => {
      (mockPrisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.criar(createDTO, 1)).rejects.toThrow(
        "Cliente não encontrado"
      );
    });

    it("deve validar responsável se fornecido", async () => {
      const dtoComResponsavel = { ...createDTO, responsavelId: 999 };
      
      (mockPrisma.cliente.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.criar(dtoComResponsavel, 1)).rejects.toThrow(
        "Responsável não encontrado"
      );
    });

    it("deve validar proposta se fornecida", async () => {
      const dtoComProposta = { ...createDTO, propostaId: 999 };
      
      (mockPrisma.cliente.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.proposta.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.criar(dtoComProposta, 1)).rejects.toThrow(
        "Proposta não encontrada"
      );
    });
  });

  describe("buscarPorId", () => {
    it("deve buscar projeto existente", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        numeroProjeto: "PRJ-2025-0001",
        titulo: "Projeto Teste",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const resultado = await service.buscarPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.numeroProjeto).toBe("PRJ-2025-0001");
    });

    it("deve retornar null se projeto não existe", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

      const resultado = await service.buscarPorId(999);

      expect(resultado).toBeNull();
    });
  });

  describe("listar", () => {
    const filtros = {
      pagina: 1,
      limite: 10,
    };

    it("deve listar projetos com paginação", async () => {
      (mockPrisma.projeto.findMany as jest.Mock).mockResolvedValue([
        { id: 1, titulo: "Projeto 1", cliente: { id: 1, nome: "Cliente" } },
        { id: 2, titulo: "Projeto 2", cliente: { id: 1, nome: "Cliente" } },
      ] as any);
      (mockPrisma.projeto.count as jest.Mock).mockResolvedValue(2);

      const resultado = await service.listar(filtros);

      expect(resultado.data).toHaveLength(2);
      expect(resultado.paginacao.totalItens).toBe(2);
    });

    it("deve filtrar por cliente", async () => {
      const filtrosCliente = { ...filtros, clienteId: 1 };
      
      (mockPrisma.projeto.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.projeto.count as jest.Mock).mockResolvedValue(0);

      await service.listar(filtrosCliente);

      expect(mockPrisma.projeto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clienteId: 1 }),
        })
      );
    });

    it("deve filtrar por status", async () => {
      const filtrosStatus = { ...filtros, status: ["em_execucao" as const] };
      
      (mockPrisma.projeto.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.projeto.count as jest.Mock).mockResolvedValue(0);

      await service.listar(filtrosStatus);

      expect(mockPrisma.projeto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ["em_execucao"] } }),
        })
      );
    });

    it("deve buscar por termo", async () => {
      const filtrosBusca = { ...filtros, busca: "teste" };
      
      (mockPrisma.projeto.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.projeto.count as jest.Mock).mockResolvedValue(0);

      await service.listar(filtrosBusca);

      expect(mockPrisma.projeto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe("atualizar", () => {
    const updateDTO = {
      titulo: "Projeto Atualizado",
      descricao: "Nova descrição",
    };

    it("deve atualizar projeto existente", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
      } as any);
      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        ...updateDTO,
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const resultado = await service.atualizar(1, updateDTO, 1);

      expect(resultado.titulo).toBe(updateDTO.titulo);
    });

    it("deve rejeitar se projeto não existe", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.atualizar(999, updateDTO, 1)).rejects.toThrow(
        ProjectServiceError
      );
    });

    it("deve bloquear alteração de baseline com baseline lockada", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        baselineLockedAt: new Date(),
      } as any);

      await expect(
        service.atualizar(1, { budgetBaseline: { version: 1 } }, 1)
      ).rejects.toThrow("Baseline está bloqueada para este projeto");

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });
  });

  describe("alterarStatus", () => {
    it("deve alterar status com transição válida", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto",
        status: "planejado",
      } as any);
      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "em_execucao",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const resultado = await service.alterarStatus(
        1,
        { novoStatus: "em_execucao" },
        1
      );

      expect(resultado.status).toBe("em_execucao");
    });

    it("deve rejeitar transição inválida", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
      } as any);

      await expect(
        service.alterarStatus(1, { novoStatus: "planejado" }, 1)
      ).rejects.toThrow("Transição de status inválida");
    });

    it("deve registrar data de conclusão ao concluir", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto",
        status: "aguardando_devolucoes",
        Proposta: null,
        projectPermits: [],
        projectInspections: [],
      } as any);
      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        dataConclusao: new Date(),
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      // Mock triageGateway to allow completion
      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "concluido",
            dataConclusao: expect.any(Date),
          }),
        })
      );
    });

    it("deve permitir fechamento quando projeto não requer permits", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto sem permit obrigatório",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [],
      } as any);

      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalled();
    });

    it("deve bloquear fechamento quando requer permit e não há permits cadastrados", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com permit obrigatório",
        status: "em_inspecao",
        Proposta: { permite: "SIM" },
        projectPermits: [],
        projectInspections: [],
      } as any);

      await expect(service.alterarStatus(1, { novoStatus: "concluido" }, 1)).rejects.toMatchObject({
        code: "PERMIT_CLOSEOUT_BLOCKED",
        statusCode: 409,
        details: expect.objectContaining({
          reason: "NO_PERMITS",
          blockingPermits: [],
        }),
      });

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });

    it("deve bloquear fechamento quando há permit não aprovado", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com permit pendente",
        status: "em_inspecao",
        Proposta: { permite: "SIM" },
        projectPermits: [
          {
            id: 101,
            permitType: "ELECTRICAL",
            jurisdiction: "City Hall",
            permitNumber: "P-001",
            status: "IN_REVIEW",
          },
        ],
        projectInspections: [],
      } as any);

      await expect(service.alterarStatus(1, { novoStatus: "concluido" }, 1)).rejects.toMatchObject({
        code: "PERMIT_CLOSEOUT_BLOCKED",
        statusCode: 409,
        details: expect.objectContaining({
          reason: "PENDING_OR_NON_APPROVED_PERMITS",
          blockingPermits: expect.arrayContaining([
            expect.objectContaining({ id: 101, status: "IN_REVIEW" }),
          ]),
        }),
      });

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });

    it("deve permitir fechamento quando todos os permits estão aprovados", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com permits aprovados",
        status: "em_inspecao",
        Proposta: { permite: "SIM" },
        projectPermits: [
          {
            id: 201,
            permitType: "GENERAL_BUILDING",
            jurisdiction: "City Hall",
            permitNumber: "P-100",
            status: "APPROVED",
          },
        ],
        projectInspections: [],
      } as any);

      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalled();
    });

    it("deve permitir fechamento sem inspeções obrigatórias", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto sem inspeções",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [],
      } as any);

      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalled();
    });

    it("não deve bloquear por inspeção informativa sem permitId", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com inspeção informativa",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [
          {
            id: 10,
            permitId: null,
            inspectionType: "HOUSEKEEPING",
            status: "SCHEDULED",
            scheduledFor: new Date("2026-02-20T10:00:00.000Z"),
          },
        ],
      } as any);

      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalled();
    });

    it("deve bloquear fechamento quando inspeção obrigatória está REQUESTED", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com inspeção pendente",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [
          {
            id: 12,
            permitId: 99,
            inspectionType: "FINAL",
            status: "REQUESTED",
            scheduledFor: new Date("2026-02-20T10:00:00.000Z"),
          },
        ],
      } as any);

      await expect(service.alterarStatus(1, { novoStatus: "concluido" }, 1)).rejects.toMatchObject({
        code: "INSPECTION_CLOSEOUT_BLOCKED",
        statusCode: 409,
        details: expect.objectContaining({
          reason: "PENDING_INSPECTIONS",
          blockingInspections: expect.arrayContaining([
            expect.objectContaining({ id: 12, status: "REQUESTED" }),
          ]),
        }),
      });

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });

    it("deve bloquear fechamento quando inspeção obrigatória está FAILED", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com inspeção reprovada",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [
          {
            id: 13,
            permitId: 100,
            inspectionType: "FINAL",
            status: "FAILED",
            scheduledFor: new Date("2026-02-20T10:00:00.000Z"),
          },
        ],
      } as any);

      await expect(service.alterarStatus(1, { novoStatus: "concluido" }, 1)).rejects.toMatchObject({
        code: "INSPECTION_CLOSEOUT_BLOCKED",
        statusCode: 409,
        details: expect.objectContaining({
          reason: "FAILED_OR_REINSPECT",
          blockingInspections: expect.arrayContaining([
            expect.objectContaining({ id: 13, status: "FAILED" }),
          ]),
        }),
      });

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });

    it("deve permitir fechamento quando inspeções obrigatórias estão PASSED", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com inspeção aprovada",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [
          {
            id: 14,
            permitId: 101,
            inspectionType: "FINAL",
            status: "PASSED",
            scheduledFor: new Date("2026-02-20T10:00:00.000Z"),
          },
        ],
      } as any);

      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalled();
    });

    it("deve permitir fechamento quando não há punch items", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto sem punch items",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [],
        projectPunchItems: [],
      } as any);

      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalled();
    });

    it("deve permitir fechamento quando punch items estão RESOLVED/VERIFIED/WONT_FIX", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com punch encerrado",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [],
        projectPunchItems: [
          {
            id: 1001,
            status: "RESOLVED",
            priority: "HIGH",
            description: "Fix trim",
            dueDate: null,
            assignedToWorkerId: 10,
          },
          {
            id: 1002,
            status: "VERIFIED",
            priority: "MEDIUM",
            description: "Seal conduit",
            dueDate: null,
            assignedToWorkerId: null,
          },
          {
            id: 1003,
            status: "WONT_FIX",
            priority: "LOW",
            description: "Minor cosmetic",
            dueDate: null,
            assignedToWorkerId: null,
          },
        ],
      } as any);

      (mockPrisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
        cliente: { id: 1, nome: "Cliente" },
      } as any);

      const mockTriageGateway = {
        verificarBloqueio: jest.fn().mockResolvedValue(false),
      };
      (service as any).triageGateway = mockTriageGateway;

      await service.alterarStatus(1, { novoStatus: "concluido" }, 1);

      expect(mockPrisma.projeto.update).toHaveBeenCalled();
    });

    it("deve bloquear fechamento quando existe punch item OPEN", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com punch OPEN",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [],
        projectPunchItems: [
          {
            id: 1101,
            status: "OPEN",
            priority: "CRITICAL",
            description: "Fix panel bonding",
            dueDate: new Date("2026-02-20T10:00:00.000Z"),
            assignedToWorkerId: 33,
          },
        ],
      } as any);

      await expect(service.alterarStatus(1, { novoStatus: "concluido" }, 1)).rejects.toMatchObject({
        code: "PUNCH_CLOSEOUT_BLOCKED",
        statusCode: 409,
        details: expect.objectContaining({
          reason: "OPEN_OR_IN_PROGRESS_PUNCH_ITEMS",
          blockingPunchItems: expect.arrayContaining([
            expect.objectContaining({ id: 1101, status: "OPEN" }),
          ]),
          counts: expect.objectContaining({ OPEN: 1, IN_PROGRESS: 0 }),
        }),
      });

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });

    it("deve bloquear fechamento quando existe punch item IN_PROGRESS", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com punch IN_PROGRESS",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [],
        projectPunchItems: [
          {
            id: 1201,
            status: "IN_PROGRESS",
            priority: "HIGH",
            description: "Replace GFCI outlet",
            dueDate: null,
            assignedToWorkerId: null,
          },
        ],
      } as any);

      await expect(service.alterarStatus(1, { novoStatus: "concluido" }, 1)).rejects.toMatchObject({
        code: "PUNCH_CLOSEOUT_BLOCKED",
        statusCode: 409,
        details: expect.objectContaining({
          reason: "OPEN_OR_IN_PROGRESS_PUNCH_ITEMS",
          blockingPunchItems: expect.arrayContaining([
            expect.objectContaining({ id: 1201, status: "IN_PROGRESS" }),
          ]),
          counts: expect.objectContaining({ OPEN: 0, IN_PROGRESS: 1 }),
        }),
      });

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });

    it("deve bloquear fechamento quando existem materiais pendentes", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        titulo: "Projeto com material pendente",
        status: "em_inspecao",
        Proposta: { permite: "NAO" },
        projectPermits: [],
        projectInspections: [],
        projectPunchItems: [],
      } as any);

      mockGetCloseoutBlockers.mockResolvedValue({
        blocking: [
          {
            id: 2201,
            flowStatus: "ISSUED",
            leftoverQty: new Prisma.Decimal("2.0000"),
            plannedQty: new Prisma.Decimal("10.0000"),
            issuedQty: new Prisma.Decimal("8.0000"),
            consumedQty: new Prisma.Decimal("5.0000"),
            returnedQty: new Prisma.Decimal("1.0000"),
            wasteQty: new Prisma.Decimal("0.0000"),
            damagedQty: new Prisma.Decimal("0.0000"),
            lostQty: new Prisma.Decimal("0.0000"),
          },
        ],
        counts: {
          flowStatusBlocking: 1,
          leftoverBlocking: 1,
          totalBlocking: 1,
        },
        totalsPendingQty: new Prisma.Decimal("2.0000"),
      });

      await expect(service.alterarStatus(1, { novoStatus: "concluido" }, 1)).rejects.toMatchObject({
        code: "MATERIAL_CLOSEOUT_BLOCKED",
        statusCode: 409,
        details: expect.objectContaining({
          reason: "MATERIALS_PENDING_CLOSEOUT",
          counts: expect.objectContaining({ totalBlocking: 1 }),
          totalsPendingQty: "2.0000",
          blocking: expect.arrayContaining([
            expect.objectContaining({ id: 2201, flowStatus: "ISSUED", leftoverQty: "2.0000" }),
          ]),
        }),
      });

      expect(mockPrisma.projeto.update).not.toHaveBeenCalled();
    });
  });

  describe("excluir", () => {
    it("deve excluir projeto planejado (soft delete)", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clienteId: 1,
        numeroProjeto: "PRJ-2025-0001",
        titulo: "Projeto",
        status: "planejado",
      } as any);

      await service.excluir(1, 1, "Projeto cancelado pelo cliente");

      // Soft delete: não chama delete, apenas registra no histórico
      expect(mockPrisma.projeto.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("deve rejeitar se projeto não existe", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.excluir(999, 1, "Motivo")).rejects.toThrow(
        ProjectServiceError
      );
    });

    it("deve rejeitar exclusão de projeto em execução", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "em_execucao",
      } as any);

      await expect(service.excluir(1, 1, "Motivo")).rejects.toThrow(
        "Não é possível excluir projetos em execução ou concluídos"
      );
    });

    it("deve rejeitar exclusão de projeto concluído", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluido",
      } as any);

      await expect(service.excluir(1, 1, "Motivo")).rejects.toThrow(
        "Não é possível excluir projetos em execução ou concluídos"
      );
    });
  });
});