jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projeto: { findUnique: jest.fn() },
    projetoMaterial: {
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
import { ProjectMaterialService, ProjectMaterialServiceError } from "../ProjectMaterialService";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("ProjectMaterialService", () => {
  let service: ProjectMaterialService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectMaterialService();
  });

  describe("criar", () => {
    it("deve criar material com sucesso", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoMaterial.create as jest.Mock).mockResolvedValue({
        id: 1,
        nome: "Cimento",
        quantidadePlanejada: 100,
        unidade: "sacos",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.criar(
        { projetoId: 1, nome: "Cimento", quantidadePlanejada: 100, unidade: "sacos" },
        1
      );

      expect(resultado.nome).toBe("Cimento");
    });

    it("deve rejeitar se projeto não existe", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.criar({ projetoId: 999, nome: "Material", quantidadePlanejada: 1, unidade: "un" }, 1)
      ).rejects.toThrow(ProjectMaterialServiceError);
    });
  });

  describe("buscarPorId", () => {
    it("deve buscar material existente", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        nome: "Cimento",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.buscarPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.nome).toBe("Cimento");
    });

    it("deve retornar null se não existe", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue(null);

      const resultado = await service.buscarPorId(999);

      expect(resultado).toBeNull();
    });
  });

  describe("listarPorProjeto", () => {
    it("deve listar materiais do projeto", async () => {
      (mockPrisma.projetoMaterial.findMany as jest.Mock).mockResolvedValue([
        { id: 1, nome: "Material 1", projeto: { id: 1 } },
        { id: 2, nome: "Material 2", projeto: { id: 1 } },
      ] as any);

      const resultado = await service.listarPorProjeto(1);

      expect(resultado).toHaveLength(2);
    });
  });

  describe("atualizar", () => {
    it("deve atualizar material existente", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({ id: 1, projetoId: 1 } as any);
      (mockPrisma.projetoMaterial.update as jest.Mock).mockResolvedValue({
        id: 1,
        nome: "Atualizado",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.atualizar(1, { nome: "Atualizado" }, 1);

      expect(resultado.nome).toBe("Atualizado");
    });

    it("deve rejeitar se material não existe", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.atualizar(999, { nome: "Teste" }, 1)).rejects.toThrow(
        ProjectMaterialServiceError
      );
    });
  });

  describe("alterarStatus", () => {
    it("deve alterar status com transição válida", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        status: "liberado",
      } as any);
      (mockPrisma.projetoMaterial.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: "em_uso",
        projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
      } as any);

      const resultado = await service.alterarStatus(1, { novoStatus: "em_uso" }, 1);

      expect(resultado.status).toBe("em_uso");
    });

    it("deve rejeitar transição inválida", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "finalizado",
      } as any);

      await expect(service.alterarStatus(1, { novoStatus: "em_uso" }, 1)).rejects.toThrow(
        "Transição de status inválida"
      );
    });
  });

  describe("excluir", () => {
    it("deve excluir material planejado", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        status: "planejado",
      } as any);
      (mockPrisma.projetoMaterial.delete as jest.Mock).mockResolvedValue({} as any);

      await service.excluir(1, 1);

      expect(mockPrisma.projetoMaterial.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("deve rejeitar exclusão de material em uso", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        status: "em_uso",
      } as any);

      await expect(service.excluir(1, 1)).rejects.toThrow(
        "Não é possível excluir materiais em uso"
      );
    });

    it("deve rejeitar se material não existe", async () => {
      (mockPrisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.excluir(999, 1)).rejects.toThrow(ProjectMaterialServiceError);
    });
  });
});