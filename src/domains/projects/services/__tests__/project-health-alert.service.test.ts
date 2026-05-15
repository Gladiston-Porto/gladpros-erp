jest.mock('@/lib/prisma', () => ({
  prisma: {
    projectHealthAlert: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockGetProjectHealthSnapshot = jest.fn();

jest.mock('../project-health.service', () => ({
  getProjectHealthSnapshot: (...args: unknown[]) => mockGetProjectHealthSnapshot(...args),
}));

import { prisma } from '@/lib/prisma';
import { syncProjectHealthAlerts, updateProjectHealthAlertStatus } from '../project-health-alert.service';

const mockPrisma = prisma as {
  projectHealthAlert: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const now = new Date('2026-05-15T12:00:00.000Z');

function mockSnapshot(alerts = [
  { type: 'CASH_GAP', severity: 'ALERT', message: 'Cash gap ativo', metric: 2500 },
]) {
  mockGetProjectHealthSnapshot.mockResolvedValue({
    projetoId: 1,
    numeroProjeto: 'PRJ-001',
    status: 'em_execucao',
    progressPct: 50,
    expectedProgressPct: 60,
    scheduleVariancePct: -10,
    budgetUsedPct: 75,
    plannedRevenue: 10000,
    plannedCost: 7000,
    actualCost: 6000,
    committedCost: 1000,
    estimatedAtCompletion: 9000,
    projectedProfit: 1000,
    projectedMarginPct: 10,
    laborPlannedHours: 0,
    laborActualHours: 20,
    laborCost: 1200,
    materialPlannedCost: 2500,
    materialActualCost: 3000,
    materialVariance: 500,
    invoicedAmount: 4000,
    paidAmount: 3500,
    billingCoveragePct: 58.33,
    invoiceCoveragePct: 66.67,
    cashGap: 2500,
    openBudgetAlerts: 0,
    osMarginRiskCount: 0,
    riskScore: 'ALERT',
    alerts,
    recommendations: [
      { priority: 'ALERT', action: 'Emitir progress invoice', reason: 'Cash gap alto' },
    ],
    updatedAt: now,
  });
}

describe('syncProjectHealthAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
      callback(mockPrisma)
    );
    mockPrisma.projectHealthAlert.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.projectHealthAlert.create.mockResolvedValue({ id: 1 });
    mockPrisma.projectHealthAlert.update.mockResolvedValue({ id: 1 });
  });

  it('cria alertas novos com chave ativa deduplicável', async () => {
    mockSnapshot();
    mockPrisma.projectHealthAlert.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, type: 'CASH_GAP' }]);

    const result = await syncProjectHealthAlerts(1, { userId: 7, now });

    expect(result?.created).toBe(1);
    expect(mockPrisma.projectHealthAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projetoId: 1,
          type: 'CASH_GAP',
          severity: 'ALERT',
          activeKey: 'PROJECT:1:HEALTH:CASH_GAP',
          recommendation: 'Emitir progress invoice',
        }),
      })
    );
    expect(mockPrisma.projectHealthAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activeKey: { notIn: ['PROJECT:1:HEALTH:CASH_GAP'] },
        }),
      })
    );
  });

  it('atualiza alerta existente sem perder acknowledged', async () => {
    mockSnapshot();
    mockPrisma.projectHealthAlert.findMany
      .mockResolvedValueOnce([
        { id: 9, activeKey: 'PROJECT:1:HEALTH:CASH_GAP', status: 'ACKNOWLEDGED' },
      ])
      .mockResolvedValueOnce([{ id: 9, status: 'ACKNOWLEDGED' }]);

    const result = await syncProjectHealthAlerts(1, { now });

    expect(result?.created).toBe(0);
    expect(mockPrisma.projectHealthAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9 },
        data: expect.objectContaining({
          status: 'ACKNOWLEDGED',
          lastDetectedAt: now,
        }),
      })
    );
  });

  it('resolve alertas ativos quando o Health Engine não retorna riscos', async () => {
    mockSnapshot([]);
    mockPrisma.projectHealthAlert.findMany.mockResolvedValueOnce([]);
    mockPrisma.projectHealthAlert.updateMany.mockResolvedValue({ count: 2 });

    const result = await syncProjectHealthAlerts(1, { userId: 7, now });

    expect(result?.updated).toBe(2);
    expect(mockPrisma.projectHealthAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projetoId: 1, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedAt: now,
          resolvedBy: 7,
        }),
      })
    );
  });
});

describe('updateProjectHealthAlertStatus', () => {
  it('marca alerta como reconhecido pelo usuário', async () => {
    mockPrisma.projectHealthAlert.updateMany.mockResolvedValue({ count: 1 });

    await updateProjectHealthAlertStatus(1, 9, 'ACKNOWLEDGED', 7);

    expect(mockPrisma.projectHealthAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9, projetoId: 1 },
        data: expect.objectContaining({
          status: 'ACKNOWLEDGED',
          acknowledgedBy: 7,
        }),
      })
    );
  });
});
