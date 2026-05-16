jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: { findUnique: jest.fn() },
    expense: { aggregate: jest.fn() },
    timesheetEntry: { findMany: jest.fn() },
    serviceOrder: { aggregate: jest.fn(), count: jest.fn() },
    workEntry: { aggregate: jest.fn() },
    projetoMaterial: { findMany: jest.fn() },
    projetoMaterialEstoque: { aggregate: jest.fn() },
    purchaseOrder: { aggregate: jest.fn() },
    changeOrder: { aggregate: jest.fn() },
    invoice: { aggregate: jest.fn() },
    budgetAlert: { count: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { getProjectHealthSnapshot } from '../project-health.service';

const mockPrisma = prisma as unknown as {
  projeto: { findUnique: jest.Mock };
  expense: { aggregate: jest.Mock };
  timesheetEntry: { findMany: jest.Mock };
  serviceOrder: { aggregate: jest.Mock; count: jest.Mock };
  workEntry: { aggregate: jest.Mock };
  projetoMaterial: { findMany: jest.Mock };
  projetoMaterialEstoque: { aggregate: jest.Mock };
  purchaseOrder: { aggregate: jest.Mock };
  changeOrder: { aggregate: jest.Mock };
  invoice: { aggregate: jest.Mock };
  budgetAlert: { count: jest.Mock };
  $queryRaw: jest.Mock;
};

const fixedNow = new Date('2026-05-15T12:00:00.000Z');

function mockHealthyDefaults() {
  mockPrisma.projeto.findUnique.mockResolvedValue({
    id: 1,
    numeroProjeto: 'PRJ-2026-001',
    status: 'em_execucao',
    valorEstimado: 10000,
    custoPrevisto: 6000,
    dataInicioPrevista: new Date('2026-05-01T00:00:00.000Z'),
    dataConclusaoPrevista: new Date('2026-05-31T00:00:00.000Z'),
    Etapas: [
      { status: 'em_andamento', porcentagem: 50 },
      { status: 'pendente', porcentagem: 40 },
    ],
  });
  mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { valor: 500 } });
  mockPrisma.$queryRaw.mockResolvedValue([{ totalHours: 10, totalCost: 400 }]);
  mockPrisma.serviceOrder.aggregate.mockResolvedValue({ _sum: { materialTotal: 200, laborTotal: 300 } });
  mockPrisma.serviceOrder.count.mockResolvedValue(0);
  mockPrisma.workEntry.aggregate.mockResolvedValue({ _sum: { totalMinutes: 120, totalCost: 250 } });
  mockPrisma.projetoMaterial.findMany.mockResolvedValue([
    {
      plannedQty: 10,
      consumedQty: 5,
      quantidadeUtilizada: 5,
      plannedUnitCost: 100,
      actualUnitCost: 100,
    },
  ]);
  mockPrisma.projetoMaterialEstoque.aggregate.mockResolvedValue({ _sum: { custoTotal: 450 } });
  mockPrisma.purchaseOrder.aggregate.mockResolvedValue({
    _sum: { totalAmount: 1000, receivedAmount: 500 },
  });
  mockPrisma.changeOrder.aggregate.mockResolvedValue({
    _sum: { priceDelta: 0, costDelta: 0 },
  });
  mockPrisma.invoice.aggregate.mockResolvedValue({
    _sum: { valorTotal: 3000, valorPago: 3000 },
  });
  mockPrisma.budgetAlert.count.mockResolvedValue(0);
}

describe('getProjectHealthSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHealthyDefaults();
  });

  it('retorna null quando projeto não existe', async () => {
    mockPrisma.projeto.findUnique.mockResolvedValue(null);

    await expect(getProjectHealthSnapshot(999, fixedNow)).resolves.toBeNull();
  });

  it('consolida custo, faturamento, caixa e progresso do projeto', async () => {
    const snapshot = await getProjectHealthSnapshot(1, fixedNow);

    expect(snapshot).toMatchObject({
      projetoId: 1,
      numeroProjeto: 'PRJ-2026-001',
      progressPct: 45,
      plannedRevenue: 10000,
      plannedCost: 6000,
      actualCost: 1900,
      committedCost: 1000,
      invoicedAmount: 3000,
      paidAmount: 3000,
      cashGap: 0,
      riskScore: 'OK',
    });
    expect(snapshot?.laborActualHours).toBe(12);
    expect(snapshot?.materialActualCost).toBe(500);
  });

  it('gera alertas acionáveis para cash gap, invoice needed e prejuízo projetado', async () => {
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { valor: 4500 } });
    mockPrisma.$queryRaw.mockResolvedValue([{ totalHours: 30, totalCost: 1500 }]);
    mockPrisma.serviceOrder.aggregate.mockResolvedValue({ _sum: { materialTotal: 1200, laborTotal: 800 } });
    mockPrisma.workEntry.aggregate.mockResolvedValue({ _sum: { totalMinutes: 600, totalCost: 800 } });
    mockPrisma.serviceOrder.count.mockResolvedValue(1);
    mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { valorTotal: 1000, valorPago: 500 } });

    const snapshot = await getProjectHealthSnapshot(1, fixedNow);

    expect(snapshot?.riskScore).toBe('LOSS');
    expect(snapshot?.alerts.map((alert) => alert.type)).toEqual(
      expect.arrayContaining(['PROJECTED_LOSS', 'CASH_GAP', 'INVOICE_NEEDED', 'OS_MARGIN_RISK'])
    );
    expect(snapshot?.recommendations[0].priority).toBe('LOSS');
  });

  it('usa queries filtradas por índices e status relevantes', async () => {
    await getProjectHealthSnapshot(1, fixedNow);

    expect(mockPrisma.invoice.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projetoId: 1,
          status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE'] },
        }),
      })
    );
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(mockPrisma.projetoMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projetoId: 1 },
        take: 1000,
      })
    );
  });
});
