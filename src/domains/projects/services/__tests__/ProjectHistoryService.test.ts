jest.mock("@/lib/prisma", () => ({
  prisma: {
    projetoHistorico: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { ProjectHistoryService } from "../ProjectHistoryService";
import { ACAO_HISTORICO } from "../../entities";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("ProjectHistoryService", () => {
  let service: ProjectHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectHistoryService();
  });

  describe("registrar", () => {
    it("deve registrar um histórico completo", async () => {
      const mockHistorico = {
        id: 1,
        projetoId: 1,
        usuarioId: 1,
        acao: ACAO_HISTORICO.CRIACAO,
        detalhes: "Projeto criado",
        criadoEm: new Date(),
      };

      (mockPrisma.projetoHistorico.create as jest.Mock).mockResolvedValue(mockHistorico as any);

      const resultado = await service.registrar({
        projetoId: 1,
        usuarioId: 1,
        acao: ACAO_HISTORICO.CRIACAO,
        detalhes: "Projeto criado",
      });

      expect(resultado).toEqual(mockHistorico);
      expect(mockPrisma.projetoHistorico.create).toHaveBeenCalledWith({
        data: {
          projetoId: 1,
          usuarioId: 1,
          acao: ACAO_HISTORICO.CRIACAO,
          detalhes: "Projeto criado",
        },
      });
    });

    it("deve registrar histórico sem campos opcionais", async () => {
      const mockHistorico = {
        id: 2,
        projetoId: 1,
        usuarioId: 1,
        acao: ACAO_HISTORICO.ATUALIZACAO,
        detalhes: "Projeto atualizado",
        criadoEm: new Date(),
      };

      (mockPrisma.projetoHistorico.create as jest.Mock).mockResolvedValue(mockHistorico as any);

      await service.registrar({
        projetoId: 1,
        usuarioId: 1,
        acao: ACAO_HISTORICO.ATUALIZACAO,
        detalhes: "Projeto atualizado",
      });

      expect(mockPrisma.projetoHistorico.create).toHaveBeenCalledWith({
        data: {
          projetoId: 1,
          usuarioId: 1,
          acao: ACAO_HISTORICO.ATUALIZACAO,
          detalhes: "Projeto atualizado",
        },
      });
    });
  });

  describe("listar", () => {
    it("deve listar histórico com paginação padrão", async () => {
      const mockHistoricos = [
        {
          id: 1,
          projetoId: 1,
          acao: ACAO_HISTORICO.CRIACAO,
          detalhes: "Projeto criado",
          criadoEm: new Date(),
          Usuario: {
            id: 1,
            nome: "João Silva",
            email: "joao@example.com",
          },
        },
      ];

      (mockPrisma.projetoHistorico.findMany as jest.Mock).mockResolvedValue(mockHistoricos as any);
      (mockPrisma.projetoHistorico.count as jest.Mock).mockResolvedValue(1);

      const resultado = await service.listar(1, { projetoId: 1 });

      expect(resultado.data).toEqual(mockHistoricos);
      expect(resultado.paginacao.totalItens).toBe(1);
      expect(mockPrisma.projetoHistorico.findMany).toHaveBeenCalledWith({
        where: {
          projetoId: 1,
        },
        skip: 0,
        take: 50,
        orderBy: { criadoEm: "desc" },
        include: {
          Usuario: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
            },
          },
        },
      });
    });

    it("deve listar histórico com filtros completos", async () => {
      (mockPrisma.projetoHistorico.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.projetoHistorico.count as jest.Mock).mockResolvedValue(0);

      await service.listar(1, {
        projetoId: 1,
        pagina: 2,
        limite: 10,
        acoes: [ACAO_HISTORICO.STATUS_ALTERADO],
        usuarioId: 1,
        dataInicio: "2025-01-01",
        dataFim: "2025-01-31",
      });

      expect(mockPrisma.projetoHistorico.findMany).toHaveBeenCalledWith({
        where: {
          projetoId: 1,
          acao: { in: [ACAO_HISTORICO.STATUS_ALTERADO] },
          usuarioId: 1,
          criadoEm: {
            gte: new Date("2025-01-01"),
            lte: new Date("2025-01-31"),
          },
        },
        skip: 10,
        take: 10,
        orderBy: { criadoEm: "desc" },
        include: {
          Usuario: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
            },
          },
        },
      });
    });

    it("deve calcular paginação corretamente", async () => {
      (mockPrisma.projetoHistorico.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.projetoHistorico.count as jest.Mock).mockResolvedValue(25);

      const resultado = await service.listar(1, { projetoId: 1, pagina: 2, limite: 10 });

      expect(resultado.paginacao.totalItens).toBe(25);
      expect(resultado.paginacao.totalPaginas).toBe(3);
      expect(resultado.paginacao.temProxima).toBe(true);
      expect(resultado.paginacao.temAnterior).toBe(true);
    });
  });

  describe("buscarPorId", () => {
    it("deve buscar histórico por ID", async () => {
      const mockHistorico = {
        id: 1,
        projetoId: 1,
        acao: ACAO_HISTORICO.CRIACAO,
        detalhes: "Projeto criado",
        Usuario: {
          id: 1,
          nome: "João Silva",
          email: "joao@example.com",
        },
        Projeto: {
          id: 1,
          numeroProjeto: "PRJ-2025-0001",
          titulo: "Projeto Teste",
        },
      };

      (mockPrisma.projetoHistorico.findUnique as jest.Mock).mockResolvedValue(mockHistorico as any);

      const resultado = await service.buscarPorId(1);

      expect(resultado).toEqual(mockHistorico);
      expect(mockPrisma.projetoHistorico.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          Usuario: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
            },
          },
          Projeto: {
            select: {
              id: true,
              numeroProjeto: true,
              titulo: true,
            },
          },
        },
      });
    });

    it("deve retornar null se histórico não existe", async () => {
      (mockPrisma.projetoHistorico.findUnique as jest.Mock).mockResolvedValue(null);

      const resultado = await service.buscarPorId(999);

      expect(resultado).toBeNull();
    });
  });

  describe("obterUltimoEvento", () => {
    it("deve obter último evento de um tipo", async () => {
      const mockEvento = {
        id: 1,
        projetoId: 1,
        acao: ACAO_HISTORICO.STATUS_ALTERADO,
        detalhes: "Status alterado",
        criadoEm: new Date(),
        Usuario: {
          id: 1,
          nome: "João Silva",
          email: "joao@example.com",
        },
      };

      (mockPrisma.projetoHistorico.findFirst as jest.Mock).mockResolvedValue(mockEvento as any);

      const resultado = await service.obterUltimoEvento(1, ACAO_HISTORICO.STATUS_ALTERADO);

      expect(resultado).toEqual(mockEvento);
      expect(mockPrisma.projetoHistorico.findFirst).toHaveBeenCalledWith({
        where: {
          projetoId: 1,
          acao: ACAO_HISTORICO.STATUS_ALTERADO,
        },
        orderBy: {
          criadoEm: "desc",
        },
        include: {
          Usuario: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true,
            },
          },
        },
      });
    });

    it("deve retornar null se não houver evento", async () => {
      (mockPrisma.projetoHistorico.findFirst as jest.Mock).mockResolvedValue(null);

      const resultado = await service.obterUltimoEvento(1, ACAO_HISTORICO.ETAPA_CRIADA);

      expect(resultado).toBeNull();
    });
  });

  describe("contarEventos", () => {
    it("deve contar todos os eventos de um projeto", async () => {
      (mockPrisma.projetoHistorico.count as jest.Mock).mockResolvedValue(10);

      const resultado = await service.contarEventos(1);

      expect(resultado).toBe(10);
      expect(mockPrisma.projetoHistorico.count).toHaveBeenCalledWith({
        where: {
          projetoId: 1,
        },
      });
    });

    it("deve contar eventos de um tipo específico", async () => {
      (mockPrisma.projetoHistorico.count as jest.Mock).mockResolvedValue(3);

      const resultado = await service.contarEventos(1, ACAO_HISTORICO.ANEXO_ADICIONADO);

      expect(resultado).toBe(3);
      expect(mockPrisma.projetoHistorico.count).toHaveBeenCalledWith({
        where: {
          projetoId: 1,
          acao: ACAO_HISTORICO.ANEXO_ADICIONADO,
        },
      });
    });
  });
});