jest.mock("@/shared/lib/prisma", () => ({
  __esModule: true,
  default: {
    projeto: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { ProjectNumberService } from "../ProjectNumberService";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("ProjectNumberService", () => {
  let service: ProjectNumberService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectNumberService();
  });

  describe("gerarNumeroProjeto", () => {
    it("deve gerar o primeiro número do ano", async () => {
      const ano = new Date().getFullYear();
      (mockPrisma.projeto.findFirst as jest.Mock).mockResolvedValue(null);

      const numero = await service.gerarNumeroProjeto();

      expect(numero).toBe(`PRJ-${ano}-0001`);
      expect(mockPrisma.projeto.findFirst).toHaveBeenCalledWith({
        where: {
          numeroProjeto: {
            startsWith: `PRJ-${ano}-`,
          },
        },
        orderBy: {
          numeroProjeto: "desc",
        },
        select: {
          numeroProjeto: true,
        },
      });
    });

    it("deve incrementar o número sequencial", async () => {
      const ano = new Date().getFullYear();
      (mockPrisma.projeto.findFirst as jest.Mock).mockResolvedValue({
        numeroProjeto: `PRJ-${ano}-0005`,
      } as any);

      const numero = await service.gerarNumeroProjeto();

      expect(numero).toBe(`PRJ-${ano}-0006`);
    });

    it("deve gerar números com padding correto", async () => {
      const ano = new Date().getFullYear();
      (mockPrisma.projeto.findFirst as jest.Mock).mockResolvedValue({
        numeroProjeto: `PRJ-${ano}-0099`,
      } as any);

      const numero = await service.gerarNumeroProjeto();

      expect(numero).toBe(`PRJ-${ano}-0100`);
    });

    it("deve gerar números acima de 1000", async () => {
      const ano = new Date().getFullYear();
      (mockPrisma.projeto.findFirst as jest.Mock).mockResolvedValue({
        numeroProjeto: `PRJ-${ano}-0999`,
      } as any);

      const numero = await service.gerarNumeroProjeto();

      expect(numero).toBe(`PRJ-${ano}-1000`);
    });
  });

  describe("numeroprojetoJaExiste", () => {
    it("deve retornar true se número já existe", async () => {
      (mockPrisma.projeto.count as jest.Mock).mockResolvedValue(1);

      const existe = await service.numeroprojetoJaExiste("PRJ-2025-0001");

      expect(existe).toBe(true);
      expect(mockPrisma.projeto.count).toHaveBeenCalledWith({
        where: {
          numeroProjeto: "PRJ-2025-0001",
        },
      });
    });

    it("deve retornar false se número não existe", async () => {
      (mockPrisma.projeto.count as jest.Mock).mockResolvedValue(0);

      const existe = await service.numeroprojetoJaExiste("PRJ-2025-9999");

      expect(existe).toBe(false);
    });
  });

  describe("validarFormato", () => {
    describe("formatos válidos", () => {
      it("deve validar formato padrão", () => {
        expect(service.validarFormato("PRJ-2025-0001")).toBe(true);
      });

      it("deve validar número alto", () => {
        expect(service.validarFormato("PRJ-2024-9999")).toBe(true);
      });

      it("deve validar número zero", () => {
        expect(service.validarFormato("PRJ-2000-0000")).toBe(true);
      });
    });

    describe("formatos inválidos", () => {
      it("deve rejeitar formato com 3 dígitos", () => {
        expect(service.validarFormato("PRJ-2025-001")).toBe(false);
      });

      it("deve rejeitar formato com ano de 2 dígitos", () => {
        expect(service.validarFormato("PRJ-25-0001")).toBe(false);
      });

      it("deve rejeitar prefixo incorreto", () => {
        expect(service.validarFormato("PROJ-2025-0001")).toBe(false);
      });

      it("deve rejeitar letras no número", () => {
        expect(service.validarFormato("PRJ-2025-ABCD")).toBe(false);
      });

      it("deve rejeitar espaços", () => {
        expect(service.validarFormato("PRJ 2025 0001")).toBe(false);
      });

      it("deve rejeitar string vazia", () => {
        expect(service.validarFormato("")).toBe(false);
      });
    });
  });

  describe("extrairAno", () => {
    it("deve extrair ano válido", () => {
      const ano = service.extrairAno("PRJ-2025-0001");
      expect(ano).toBe(2025);
    });

    it("deve retornar null para formato inválido", () => {
      const ano = service.extrairAno("INVALIDO");
      expect(ano).toBeNull();
    });

    it("deve extrair diferentes anos", () => {
      expect(service.extrairAno("PRJ-2024-0001")).toBe(2024);
      expect(service.extrairAno("PRJ-2026-0001")).toBe(2026);
      expect(service.extrairAno("PRJ-2000-0001")).toBe(2000);
    });
  });

  describe("extrairNumeroSequencial", () => {
    it("deve extrair número sequencial válido", () => {
      const numero = service.extrairNumeroSequencial("PRJ-2025-0001");
      expect(numero).toBe(1);
    });

    it("deve retornar null para formato inválido", () => {
      const numero = service.extrairNumeroSequencial("INVALIDO");
      expect(numero).toBeNull();
    });

    it("deve extrair diferentes números", () => {
      expect(service.extrairNumeroSequencial("PRJ-2025-0001")).toBe(1);
      expect(service.extrairNumeroSequencial("PRJ-2025-0099")).toBe(99);
      expect(service.extrairNumeroSequencial("PRJ-2025-1234")).toBe(1234);
      expect(service.extrairNumeroSequencial("PRJ-2025-0000")).toBe(0);
    });
  });
});