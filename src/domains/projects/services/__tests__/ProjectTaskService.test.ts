jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projeto: { findUnique: jest.fn() },
    projetoEtapa: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    projetoTarefa: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../ProjectHistoryService", () => ({
  ProjectHistoryService: jest.fn().mockImplementation(() => ({
    registrar: jest.fn(),
  })),
}));

import { prisma } from "@/lib/prisma";
import { ProjectTaskService, ProjectTaskServiceError } from "../ProjectTaskService";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("ProjectTaskService", () => {
  let service: ProjectTaskService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectTaskService();
  });

  describe("criar", () => {
    const createDTO = {
      projetoId: 1,
      titulo: "Implementar API",
      descricao: "Criar endpoints REST",
      prioridade: "alta" as const,
      prazo: "2025-12-31",
    };

    it("deve criar tarefa com sucesso", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoTarefa.create as jest.Mock).mockResolvedValue({
        id: 1,
        ...createDTO,
        prazo: new Date(createDTO.prazo),
        status: "aberta",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
        etapa: null,
        responsavel: null,
      } as any);

      const resultado = await service.criar(createDTO, 1);

      expect(resultado.titulo).toBe(createDTO.titulo);
      expect(resultado.status).toBe("aberta");
    });

    it("deve rejeitar se projeto não existe", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.criar(createDTO, 1)).rejects.toThrow(
        ProjectTaskServiceError
      );
    });

    it("deve criar tarefa com etapa válida", async () => {
      const dtoComEtapa = { ...createDTO, etapaId: 1 };
      
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
      } as any);
      (mockPrisma.projetoTarefa.create as jest.Mock).mockResolvedValue({
        id: 1,
        ...dtoComEtapa,
        Etapa: { id: 1, servico: "Etapa 1" },
        Projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.criar(dtoComEtapa, 1);

      expect(resultado.etapaId).toBe(1);
      expect(resultado.etapaServico).toBe("Etapa 1");
    });

    it("deve rejeitar se etapa não pertence ao projeto", async () => {
      const dtoComEtapa = { ...createDTO, etapaId: 1 };
      
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoEtapa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 999,
      } as any);

      await expect(service.criar(dtoComEtapa, 1)).rejects.toThrow(
        "Etapa não encontrada ou não pertence ao projeto"
      );
    });

    it("deve criar tarefa com responsável válido", async () => {
      const dtoComResponsavel = { ...createDTO, atribuidaPara: 1 };
      
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        nomeCompleto: "João Silva",
      } as any);
      (mockPrisma.projetoTarefa.create as jest.Mock).mockResolvedValue({
        id: 1,
        ...dtoComResponsavel,
        AtribuidaPara: { id: 1, nomeCompleto: "João Silva", email: "joao@test.com" },
        Projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.criar(dtoComResponsavel, 1);

      expect(resultado.atribuidaPara).toBe(1);
      expect(resultado.responsavelNome).toBe("João Silva");
    });

    it("deve rejeitar se responsável não existe", async () => {
      const dtoComResponsavel = { ...createDTO, atribuidaPara: 999 };
      
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.criar(dtoComResponsavel, 1)).rejects.toThrow(
        "Responsável não encontrado"
      );
    });
  });

  describe("buscarPorId", () => {
    it("deve buscar tarefa existente", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        titulo: "Tarefa Teste",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.buscarPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.titulo).toBe("Tarefa Teste");
    });

    it("deve retornar null se tarefa não existe", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue(null);

      const resultado = await service.buscarPorId(999);

      expect(resultado).toBeNull();
    });
  });

  describe("listarPorProjeto", () => {
    it("deve listar todas as tarefas do projeto", async () => {
      (mockPrisma.projetoTarefa.findMany as jest.Mock).mockResolvedValue([
        { id: 1, titulo: "Tarefa 1", projeto: { id: 1 } },
        { id: 2, titulo: "Tarefa 2", projeto: { id: 1 } },
      ] as any);

      const resultado = await service.listarPorProjeto(1);

      expect(resultado).toHaveLength(2);
      expect(mockPrisma.projetoTarefa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projetoId: 1 },
        })
      );
    });

    it("deve filtrar tarefas por etapa", async () => {
      (mockPrisma.projetoTarefa.findMany as jest.Mock).mockResolvedValue([
        { id: 1, titulo: "Tarefa 1", etapaId: 1, projeto: { id: 1 } },
      ] as any);

      const resultado = await service.listarPorProjeto(1, 1);

      expect(resultado).toHaveLength(1);
      expect(mockPrisma.projetoTarefa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projetoId: 1, etapaId: 1 },
        })
      );
    });
  });

  describe("atualizar", () => {
    const updateDTO = {
      titulo: "Tarefa Atualizada",
      descricao: "Nova descrição",
    };

    it("deve atualizar tarefa existente", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
      } as any);
      (mockPrisma.projetoTarefa.update as jest.Mock).mockResolvedValue({
        id: 1,
        ...updateDTO,
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.atualizar(1, updateDTO, 1);

      expect(resultado.titulo).toBe(updateDTO.titulo);
    });

    it("deve rejeitar se tarefa não existe", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.atualizar(999, updateDTO, 1)).rejects.toThrow(
        ProjectTaskServiceError
      );
    });
  });

  describe("alterarStatus", () => {
    it("deve alterar status com transição válida", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        titulo: "Tarefa",
        status: "aberta",
      } as any);
      (mockPrisma.projetoTarefa.update as jest.Mock).mockResolvedValue({
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
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluida",
      } as any);

      await expect(
        service.alterarStatus(1, { novoStatus: "aberta" }, 1)
      ).rejects.toThrow("Transição de status inválida");
    });

    it("deve registrar data de conclusão ao concluir tarefa", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        titulo: "Tarefa",
        status: "em_andamento",
      } as any);
      (mockPrisma.projetoTarefa.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluida",
        dataConclusao: new Date(),
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.alterarStatus(
        1,
        { novoStatus: "concluida" },
        1
      );

      expect(resultado.status).toBe("concluida");
      expect(mockPrisma.projetoTarefa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "concluida",
            dataConclusao: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("excluir", () => {
    it("deve excluir tarefa aberta", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        titulo: "Tarefa",
        status: "aberta",
      } as any);
      (mockPrisma.projetoTarefa.delete as jest.Mock).mockResolvedValue({} as any);

      await service.excluir(1, 1);

      expect(mockPrisma.projetoTarefa.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("deve rejeitar exclusão de tarefa concluída", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "concluida",
      } as any);

      await expect(service.excluir(1, 1)).rejects.toThrow(
        "Não é possível excluir tarefas concluídas"
      );
    });

    it("deve rejeitar se tarefa não existe", async () => {
      (mockPrisma.projetoTarefa.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.excluir(999, 1)).rejects.toThrow(
        ProjectTaskServiceError
      );
    });
  });
});