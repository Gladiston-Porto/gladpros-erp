jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projeto: { findUnique: jest.fn() },
    projetoAnexo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("../ProjectHistoryService", () => ({
  ProjectHistoryService: jest.fn().mockImplementation(() => ({
    registrar: jest.fn(),
  })),
}));

import { prisma } from "@/lib/prisma";
import { ProjectAttachmentService, ProjectAttachmentServiceError } from "../ProjectAttachmentService";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("ProjectAttachmentService", () => {
  let service: ProjectAttachmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectAttachmentService();
  });

  describe("criar", () => {
    const createDTO = {
      projetoId: 1,
      arquivoUrl: "/uploads/documento.pdf",
      rotulo: "Documento importante",
      publicoCliente: false,
    };

    it("deve criar anexo com sucesso", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoAnexo.create as jest.Mock).mockResolvedValue({
        id: 1,
        ...createDTO,
        criadoPor: 1,
        criadoEm: new Date(),
        Projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
        CriadoPor: { id: 1, nomeCompleto: "João Silva", email: "joao@test.com" },
      } as any);

      const resultado = await service.criar(createDTO, 1);

      expect(resultado.arquivoUrl).toBe(createDTO.arquivoUrl);
    });

    it("deve rejeitar se projeto não existe", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.criar(createDTO, 1)).rejects.toThrow(
        ProjectAttachmentServiceError
      );
    });

    it("deve formatar tamanho corretamente", async () => {
      (mockPrisma.projeto.findUnique as jest.Mock).mockResolvedValue({ id: 1 } as any);
      (mockPrisma.projetoAnexo.create as jest.Mock).mockResolvedValue({
        id: 1,
        ...createDTO,
        criadoPor: 1,
        criadoEm: new Date(),
        Projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
        CriadoPor: { id: 1, nomeCompleto: "João Silva", email: "joao@test.com" },
      } as any);

      const resultado = await service.criar(createDTO, 1);

      expect(resultado.rotulo).toBe(createDTO.rotulo);
    });
  });

  describe("buscarPorId", () => {
    it("deve buscar anexo existente", async () => {
      (mockPrisma.projetoAnexo.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        projetoId: 1,
        arquivoUrl: "/uploads/arquivo.txt",
        rotulo: "arquivo.txt",
        publicoCliente: false,
        criadoPor: 1,
        criadoEm: new Date(),
        Projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
        CriadoPor: { id: 1, nomeCompleto: "João Silva", email: "joao@test.com" },
      } as any);

      const resultado = await service.buscarPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.arquivoUrl).toBe("/uploads/arquivo.txt");
    });

    it("deve retornar null se anexo não existe", async () => {
      (mockPrisma.projetoAnexo.findUnique as jest.Mock).mockResolvedValue(null);

      const resultado = await service.buscarPorId(999);

      expect(resultado).toBeNull();
    });
  });

  describe("listarPorProjeto", () => {
    it("deve listar anexos do projeto", async () => {
      (mockPrisma.projetoAnexo.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          projetoId: 1,
          arquivoUrl: "/uploads/arquivo1.pdf",
          rotulo: "arquivo1.pdf",
          publicoCliente: false,
          criadoPor: 1,
          criadoEm: new Date(),
          Projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
          CriadoPor: { id: 1, nomeCompleto: "João Silva", email: "joao@test.com" },
        },
        {
          id: 2,
          projetoId: 1,
          arquivoUrl: "/uploads/arquivo2.docx",
          rotulo: "arquivo2.docx",
          publicoCliente: false,
          criadoPor: 1,
          criadoEm: new Date(),
          Projeto: { id: 1, numeroProjeto: "PRJ-2025-0001", titulo: "Projeto" },
          CriadoPor: { id: 1, nomeCompleto: "João Silva", email: "joao@test.com" },
        },
      ] as any);

      const resultado = await service.listarPorProjeto(1);

      expect(resultado).toHaveLength(2);
      expect(mockPrisma.projetoAnexo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projetoId: 1 },
        })
      );
    });

    it("deve retornar array vazio se não houver anexos", async () => {
      (mockPrisma.projetoAnexo.findMany as jest.Mock).mockResolvedValue([]);

      const resultado = await service.listarPorProjeto(1);

      expect(resultado).toEqual([]);
    });
  });

  describe("excluir", () => {
    it("deve excluir anexo existente", async () => {
      const mockAnexo = {
        id: 1,
        projetoId: 1,
        arquivoUrl: "/uploads/arquivo.pdf",
        rotulo: "arquivo.pdf",
        publicoCliente: false,
        criadoPor: 1,
        criadoEm: new Date(),
      };

      (mockPrisma.projetoAnexo.findUnique as jest.Mock).mockResolvedValue(mockAnexo as any);
      (mockPrisma.projetoAnexo.delete as jest.Mock).mockResolvedValue(mockAnexo as any);

      const resultado = await service.excluir(1, 1);

      expect(resultado).toEqual(mockAnexo);
      expect(mockPrisma.projetoAnexo.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("deve rejeitar se anexo não existe", async () => {
      (mockPrisma.projetoAnexo.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.excluir(999, 1)).rejects.toThrow(
        ProjectAttachmentServiceError
      );
    });
  });

  describe("obterEstatisticas", () => {
    it("deve calcular estatísticas corretamente", async () => {
      (mockPrisma.projetoAnexo.count as jest.Mock).mockResolvedValue(3);

      const resultado = await service.obterEstatisticas(1);

      expect(resultado.totalAnexos).toBe(3);
      expect(resultado.tamanhoTotal).toBe(0);
      expect(resultado.tiposArquivo).toEqual({});
    });

    it("deve retornar estatísticas vazias se não houver anexos", async () => {
      (mockPrisma.projetoAnexo.count as jest.Mock).mockResolvedValue(0);

      const resultado = await service.obterEstatisticas(1);

      expect(resultado.totalAnexos).toBe(0);
      expect(resultado.tamanhoTotal).toBe(0);
      expect(resultado.tiposArquivo).toEqual({});
    });
  });
});