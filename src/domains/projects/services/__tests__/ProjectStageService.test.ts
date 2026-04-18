jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projeto: { findUnique: jest.fn() },
    projetoEtapa: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    "$transaction": jest.fn((operations) => Promise.all(operations)),
  },
}));

jest.mock("../ProjectHistoryService", () => ({
  ProjectHistoryService: jest.fn().mockImplementation(() => ({
    registrar: jest.fn(),
  })),
}));

import { prisma } from "@/lib/prisma";
import { ProjectStageService, ProjectStageServiceError } from "../ProjectStageService";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("ProjectStageService", () => {
  let service: ProjectStageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectStageService();
  });

  describe("criar", () => {
    const createDTO = {
      projetoId: 1,
      ordem: 1,
      servico: "Planejamento",
      descricao: "Fase de planejamento do projeto",
      inicioPrevisto: "2025-01-01",
      fimPrevisto: "2025-02-01",
    };

    it("deve criar etapa com sucesso", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoEtapa.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.projetoEtapa.create as jest.Mock).mockResolvedValue({
        id: 1,
        ...createDTO,
        ordem: 1,
        status: "pendente",
        porcentagem: 0,
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.criar(createDTO, 1);

      expect(resultado.servico).toBe(createDTO.servico);
      expect(resultado.status).toBe("pendente");
      expect(resultado.ordem).toBe(1);
    });

    it("deve rejeitar se projeto não existe", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.criar(createDTO, 1)).rejects.toThrow(
        ProjectStageServiceError
      );
    });

    it("deve definir ordem automaticamente", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoEtapa.findFirst as jest.Mock).mockResolvedValue({ ordem: 3 } as any);
      (mockPrisma.projetoEtapa.create as jest.Mock).mockResolvedValue({
        id: 2,
        ...createDTO,
        ordem: 4,
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.criar(createDTO, 1);

      expect(resultado.ordem).toBe(4);
    });

    it("deve usar ordem fornecida se especificada", async () => {
      const dtoComOrdem = { ...createDTO, ordem: 5 };
      
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoEtapa.create as jest.Mock).mockResolvedValue({
        id: 1,
        ...dtoComOrdem,
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.criar(dtoComOrdem, 1);

      expect(resultado.ordem).toBe(5);
    });
  });

  describe("buscarPorId", () => {
    it("deve buscar etapa existente", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        servico: "Etapa Teste",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
        tarefas: [],
      } as any);

      const resultado = await service.buscarPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.servico).toBe("Etapa Teste");
    });

    it("deve retornar null se etapa não existe", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue(null);

      const resultado = await service.buscarPorId(999);

      expect(resultado).toBeNull();
    });
  });

  describe("listarPorProjeto", () => {
    it("deve listar etapas ordenadas", async () => {
      (mockPrisma.projetoEtapa.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          ordem: 1,
          titulo: "Etapa 1",
          projeto: { id: 1 },
          _count: { tarefas: 5 },
        },
        {
          id: 2,
          ordem: 2,
          titulo: "Etapa 2",
          projeto: { id: 1 },
          _count: { tarefas: 3 },
        },
      ] as any);

      const resultado = await service.listarPorProjeto(1);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].ordem).toBe(1);
      expect(resultado[1].ordem).toBe(2);
      expect(mockPrisma.projetoEtapa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { ordem: "asc" },
        })
      );
    });

    it("deve incluir contagem de tarefas", async () => {
      (mockPrisma.projetoEtapa.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          titulo: "Etapa",
          projeto: { id: 1 },
          _count: { Tarefas: 10 },
        },
      ] as any);

      const resultado = await service.listarPorProjeto(1);

      expect(resultado[0].totalTarefas).toBe(10);
    });
  });

  describe("atualizar", () => {
    const updateDTO = {
      servico: "Etapa Atualizada",
      porcentagem: 50,
    };

    it("deve atualizar etapa existente", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        projeto: {},
      } as any);
      (mockPrisma.projetoEtapa.update as jest.Mock).mockResolvedValue({
        id: 1,
        ...updateDTO,
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.atualizar(1, updateDTO, 1);

      expect(resultado.servico).toBe(updateDTO.servico);
      expect(resultado.porcentagem).toBe(50);
    });

    it("deve rejeitar se etapa não existe", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.atualizar(999, updateDTO, 1)).rejects.toThrow(
        ProjectStageServiceError
      );
    });
  });

  describe("alterarStatus", () => {
    it("deve alterar status com transição válida", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        titulo: "Etapa",
        status: "pendente",
      } as any);
      (mockPrisma.projetoEtapa.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "em_andamento",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.alterarStatus(
        1,
        { novoStatus: "em_andamento" },
        1
      );

      expect(resultado.status).toBe("em_andamento");
    });

    it("deve rejeitar transição inválida", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluida",
      } as any);

      await expect(
        service.alterarStatus(1, { novoStatus: "pendente" }, 1)
      ).rejects.toThrow("Transição de status inválida");
    });

    it("deve definir 100% ao concluir etapa", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        titulo: "Etapa",
        status: "em_validacao",
      } as any);
      (mockPrisma.projetoEtapa.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluida",
        porcentagem: 100,
        fimReal: new Date(),
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      await service.alterarStatus(1, { novoStatus: "concluida" }, 1);

      expect(mockPrisma.projetoEtapa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "concluida",
            porcentagem: 100,
            fimReal: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("excluir", () => {
    it("deve excluir etapa pendente", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        titulo: "Etapa",
        status: "pendente",
      } as any);
      (mockPrisma.projetoEtapa.delete as jest.Mock).mockResolvedValue({} as any);

      await service.excluir(1, 1);

      expect(mockPrisma.projetoEtapa.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("deve rejeitar exclusão de etapa concluída", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluida",
      } as any);

      await expect(service.excluir(1, 1)).rejects.toThrow(
        "Não é possível excluir etapas concluídas"
      );
    });

    it("deve rejeitar se etapa não existe", async () => {
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.excluir(999, 1)).rejects.toThrow(
        ProjectStageServiceError
      );
    });
  });

  describe("reordenar", () => {
    it("deve reordenar etapas com sucesso", async () => {
      const etapasOrdem = [
        { id: 1, ordem: 2 },
        { id: 2, ordem: 1 },
        { id: 3, ordem: 3 },
      ];

      (mockPrisma.projetoEtapa.findMany as jest.Mock).mockResolvedValue([
        { id: 1, projetoId: 1 },
        { id: 2, projetoId: 1 },
        { id: 3, projetoId: 1 },
      ] as any);

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}, {}]);

      await service.reordenar(1, etapasOrdem, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("deve rejeitar se etapas não pertencem ao projeto", async () => {
      const etapasOrdem = [
        { id: 1, ordem: 1 },
        { id: 2, ordem: 2 },
      ];

      (mockPrisma.projetoEtapa.findMany as jest.Mock).mockResolvedValue([
        { id: 1, projetoId: 1 },
      ] as any);

      await expect(service.reordenar(1, etapasOrdem, 1)).rejects.toThrow(
        "Uma ou mais etapas não pertencem ao projeto"
      );
    });
  });
});