import { prisma } from '@/lib/prisma';
import { PrismaInventoryGateway } from '../prisma-inventory.gateway';

jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    projetoMaterial: {
      findUnique: jest.fn(),
    },
    material: {
      findFirst: jest.fn(),
    },
    materialSaldo: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    materialMovimentacao: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
    callback(mockPrisma)
  );

  return { prisma: mockPrisma };
});

describe('PrismaInventoryGateway', () => {
  let gateway: PrismaInventoryGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new PrismaInventoryGateway();
  });

  describe('liberarMaterial', () => {
    it('deve consumir reserva e baixar quantidade em uma transacao', async () => {
      (prisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 10,
        codigo: 'WIRE-12',
      });
      (prisma.material.findFirst as jest.Mock).mockResolvedValue({
        id: 20,
        codigo: 'WIRE-12',
      });
      (prisma.materialSaldo.findMany as jest.Mock).mockResolvedValue([
        {
          id: 30,
          loteId: null,
          localizacaoId: 1,
          quantidade: 10,
          reservado: 6,
        },
      ]);
      (prisma.materialMovimentacao.create as jest.Mock).mockResolvedValue({ id: 40 });

      const result = await gateway.liberarMaterial({
        projetoId: 1,
        materialId: 10,
        quantidade: 4,
        usuarioId: 99,
      });

      expect(result.sucesso).toBe(true);
      expect(result.estoqueExternoId).toBe('40');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.materialSaldo.update).toHaveBeenCalledWith({
        where: { id: 30 },
        data: {
          quantidade: { decrement: 4 },
          reservado: { decrement: 4 },
        },
      });
      expect(prisma.materialMovimentacao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: 'SAIDA',
          materialId: 20,
          quantidade: 4,
          localizacaoOrigemId: 1,
          projetoId: 1,
          criadoPor: 99,
        }),
      });
    });

    it('deve bloquear liberacao quando saldo total e insuficiente', async () => {
      (prisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 10,
        codigo: 'WIRE-12',
      });
      (prisma.material.findFirst as jest.Mock).mockResolvedValue({
        id: 20,
        codigo: 'WIRE-12',
      });
      (prisma.materialSaldo.findMany as jest.Mock).mockResolvedValue([
        {
          id: 30,
          loteId: null,
          localizacaoId: 1,
          quantidade: 2,
          reservado: 0,
        },
      ]);

      const result = await gateway.liberarMaterial({
        projetoId: 1,
        materialId: 10,
        quantidade: 4,
        usuarioId: 99,
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('Saldo insuficiente');
      expect(prisma.materialSaldo.update).not.toHaveBeenCalled();
      expect(prisma.materialMovimentacao.create).not.toHaveBeenCalled();
    });
  });

  describe('devolverMaterial', () => {
    it('deve devolver material ao saldo e registrar movimentacao de entrada', async () => {
      (prisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 10,
        codigo: 'WIRE-12',
      });
      (prisma.material.findFirst as jest.Mock).mockResolvedValue({
        id: 20,
        codigo: 'WIRE-12',
      });
      (prisma.materialSaldo.findFirst as jest.Mock).mockResolvedValue({
        id: 30,
        loteId: null,
        localizacaoId: 1,
      });
      (prisma.materialMovimentacao.create as jest.Mock).mockResolvedValue({ id: 41 });

      const result = await gateway.devolverMaterial({
        projetoId: 1,
        materialId: 10,
        quantidade: 3,
        usuarioId: 99,
        condicao: 'BOM',
      });

      expect(result.sucesso).toBe(true);
      expect(result.estoqueExternoId).toBe('41');
      expect(prisma.materialSaldo.update).toHaveBeenCalledWith({
        where: { id: 30 },
        data: {
          quantidade: { increment: 3 },
        },
      });
      expect(prisma.materialMovimentacao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: 'DEVOLUCAO',
          materialId: 20,
          quantidade: 3,
          localizacaoDestinoId: 1,
          projetoId: 1,
          criadoPor: 99,
        }),
      });
    });

    it('deve registrar perda sem restaurar quantidade em estoque', async () => {
      (prisma.projetoMaterial.findUnique as jest.Mock).mockResolvedValue({
        id: 10,
        codigo: 'WIRE-12',
      });
      (prisma.material.findFirst as jest.Mock).mockResolvedValue({
        id: 20,
        codigo: 'WIRE-12',
      });
      (prisma.materialSaldo.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.materialMovimentacao.create as jest.Mock).mockResolvedValue({ id: 42 });

      const result = await gateway.devolverMaterial({
        projetoId: 1,
        materialId: 10,
        quantidade: 2,
        usuarioId: 99,
        condicao: 'PERDIDO',
      });

      expect(result.sucesso).toBe(true);
      expect(prisma.materialSaldo.update).not.toHaveBeenCalled();
      expect(prisma.materialMovimentacao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: 'PERDA',
          materialId: 20,
          quantidade: 2,
          localizacaoDestinoId: null,
        }),
      });
    });
  });
});
