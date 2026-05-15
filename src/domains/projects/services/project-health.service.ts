import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type ProjectRiskScore = 'OK' | 'WARNING' | 'ALERT' | 'CRITICAL' | 'LOSS';

export type ProjectHealthAlertType =
  | 'BUDGET_WARNING'
  | 'BUDGET_LIMIT'
  | 'PROJECTED_LOSS'
  | 'LABOR_SLOWDOWN'
  | 'MATERIAL_OVERRUN'
  | 'CASH_GAP'
  | 'INVOICE_NEEDED'
  | 'SCHEDULE_RISK'
  | 'OS_MARGIN_RISK';

/**
 * Operational alerts: visible to GERENTE (schedule, labor, materials — no financial figures).
 * Financial alerts: ADMIN and FINANCEIRO only (margins, cash, billing coverage).
 */
export const OPERATIONAL_ALERT_TYPES = new Set<ProjectHealthAlertType>([
  'LABOR_SLOWDOWN',
  'MATERIAL_OVERRUN',
  'SCHEDULE_RISK',
]);

export const FINANCIAL_ALERT_TYPES = new Set<ProjectHealthAlertType>([
  'BUDGET_WARNING',
  'BUDGET_LIMIT',
  'PROJECTED_LOSS',
  'CASH_GAP',
  'INVOICE_NEEDED',
  'OS_MARGIN_RISK',
]);

export interface ProjectHealthAlert {
  type: ProjectHealthAlertType;
  severity: Exclude<ProjectRiskScore, 'OK'>;
  message: string;
  metric?: number;
}

export interface ProjectHealthRecommendation {
  priority: Exclude<ProjectRiskScore, 'OK'>;
  action: string;
  reason: string;
}

export interface ProjectHealthSnapshot {
  projetoId: number;
  numeroProjeto: string;
  status: string;
  progressPct: number;
  expectedProgressPct: number | null;
  scheduleVariancePct: number | null;
  budgetUsedPct: number;
  plannedRevenue: number;
  plannedCost: number;
  actualCost: number;
  committedCost: number;
  estimatedAtCompletion: number;
  projectedProfit: number;
  projectedMarginPct: number;
  laborPlannedHours: number;
  laborActualHours: number;
  laborCost: number;
  materialPlannedCost: number;
  materialActualCost: number;
  materialVariance: number;
  invoicedAmount: number;
  paidAmount: number;
  billingCoveragePct: number;
  invoiceCoveragePct: number;
  cashGap: number;
  openBudgetAlerts: number;
  osMarginRiskCount: number;
  riskScore: ProjectRiskScore;
  alerts: ProjectHealthAlert[];
  recommendations: ProjectHealthRecommendation[];
  updatedAt: Date;
}

const ACTIVE_INVOICE_STATUSES = ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE'] as const;
const COST_EXPENSE_STATUSES = ['PENDENTE', 'AGUARDANDO_APROVACAO', 'APROVADA', 'PAGA'] as const;
const ACTIVE_PURCHASE_STATUSES = ['SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const;
const APPROVED_CHANGE_ORDER_STATUSES = ['APPROVED', 'APPLIED'] as const;
const COUNTED_TIMESHEET_STATUSES = ['APPROVED', 'LOCKED'] as const;
const RISKY_OS_MARGIN_STATUSES = new Set(['ALERT', 'CRITICAL', 'LOSS']);
const PROJECT_HEALTH_ROW_LIMIT = 1000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function numberValue(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round2((numerator / denominator) * 100);
}

function calculateProgress(status: string, etapas: Array<{ porcentagem: unknown }>): number {
  if (status === 'concluido' || status === 'arquivado') return 100;
  if (status === 'cancelado' || etapas.length === 0) return 0;
  const total = etapas.reduce((sum, etapa) => sum + numberValue(etapa.porcentagem), 0);
  return round2(total / etapas.length);
}

function calculateExpectedProgress(start: Date | null, end: Date | null, now: Date): number | null {
  if (!start || !end) return null;

  const startMs = start.getTime();
  const endMs = end.getTime();
  const nowMs = now.getTime();

  if (endMs <= startMs) return null;
  if (nowMs <= startMs) return 0;
  if (nowMs >= endMs) return 100;

  return round2(((nowMs - startMs) / (endMs - startMs)) * 100);
}

function addAlert(
  alerts: ProjectHealthAlert[],
  type: ProjectHealthAlertType,
  severity: Exclude<ProjectRiskScore, 'OK'>,
  message: string,
  metric?: number
) {
  alerts.push({ type, severity, message, metric: metric === undefined ? undefined : round2(metric) });
}

function addRecommendation(
  recommendations: ProjectHealthRecommendation[],
  priority: Exclude<ProjectRiskScore, 'OK'>,
  action: string,
  reason: string
) {
  recommendations.push({ priority, action, reason });
}

function rankRisk(risk: ProjectRiskScore): number {
  return { OK: 0, WARNING: 1, ALERT: 2, CRITICAL: 3, LOSS: 4 }[risk];
}

function resolveRiskScore(alerts: ProjectHealthAlert[]): ProjectRiskScore {
  if (alerts.some((alert) => alert.severity === 'LOSS')) return 'LOSS';
  if (alerts.some((alert) => alert.severity === 'CRITICAL')) return 'CRITICAL';
  if (alerts.some((alert) => alert.severity === 'ALERT')) return 'ALERT';
  if (alerts.some((alert) => alert.severity === 'WARNING')) return 'WARNING';
  return 'OK';
}

export async function getProjectHealthSnapshot(projetoId: number, now = new Date()): Promise<ProjectHealthSnapshot | null> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      numeroProjeto: true,
      status: true,
      valorEstimado: true,
      custoPrevisto: true,
      dataInicioPrevista: true,
      dataConclusaoPrevista: true,
      Etapas: {
        select: {
          status: true,
          porcentagem: true,
        },
      },
    },
  });

  if (!projeto) return null;

  const [
    expenseAgg,
    timesheetLaborRows,
    serviceOrderAgg,
    serviceOrderWorkEntryAgg,
    projectMaterials,
    stockMaterialAgg,
    purchaseAgg,
    changeOrderAgg,
    invoiceAgg,
    openBudgetAlerts,
    osMarginRiskCount,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        projetoId,
        status: { in: [...COST_EXPENSE_STATUSES] },
      },
      _sum: { valor: true },
    }),
    prisma.$queryRaw<Array<{ totalHours: unknown; totalCost: unknown }>>`
      SELECT
        COALESCE(SUM(te.hours), 0) AS totalHours,
        COALESCE(SUM(te.hours * COALESCE(a.cost_rate_hourly, 0)), 0) AS totalCost
      FROM timesheet_entries te
      INNER JOIN timesheets t ON t.id = te.timesheet_id
      INNER JOIN assignments a ON a.id = t.assignment_id
      WHERE te.project_id = ${projetoId}
        AND te.status IN (${Prisma.join(COUNTED_TIMESHEET_STATUSES)})
    `,
    prisma.serviceOrder.aggregate({
      where: { projetoId },
      _sum: {
        materialTotal: true,
        laborTotal: true,
      },
    }),
    prisma.workEntry.aggregate({
      where: { ServiceOrder: { projetoId } },
      _sum: { totalMinutes: true, totalCost: true },
    }),
    prisma.projetoMaterial.findMany({
      where: { projetoId },
      orderBy: { id: 'desc' },
      take: PROJECT_HEALTH_ROW_LIMIT,
      select: {
        plannedQty: true,
        consumedQty: true,
        quantidadeUtilizada: true,
        plannedUnitCost: true,
        actualUnitCost: true,
      },
    }),
    prisma.projetoMaterialEstoque.aggregate({
      where: { projetoId },
      _sum: {
        custoTotal: true,
      },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        projectId: projetoId,
        status: { in: [...ACTIVE_PURCHASE_STATUSES] },
      },
      _sum: {
        totalAmount: true,
        receivedAmount: true,
      },
    }),
    prisma.changeOrder.aggregate({
      where: {
        projectId: projetoId,
        status: { in: [...APPROVED_CHANGE_ORDER_STATUSES] },
      },
      _sum: {
        priceDelta: true,
        costDelta: true,
      },
    }),
    prisma.invoice.aggregate({
      where: {
        projetoId,
        status: { in: [...ACTIVE_INVOICE_STATUSES] },
      },
      _sum: {
        valorTotal: true,
        valorPago: true,
      },
    }),
    prisma.budgetAlert.count({
      where: {
        projectId: projetoId,
        acknowledgedAt: null,
      },
    }),
    prisma.serviceOrder.count({
      where: {
        projetoId,
        marginStatus: { in: [...RISKY_OS_MARGIN_STATUSES] },
      },
    }),
  ]);

  const progressPct = calculateProgress(projeto.status, projeto.Etapas);
  const expectedProgressPct = calculateExpectedProgress(
    projeto.dataInicioPrevista,
    projeto.dataConclusaoPrevista,
    now
  );
  const scheduleVariancePct =
    expectedProgressPct === null ? null : round2(progressPct - expectedProgressPct);

  const baseRevenue = numberValue(projeto.valorEstimado);
  const basePlannedCost = numberValue(projeto.custoPrevisto);
  const approvedRevenueDelta = numberValue(changeOrderAgg._sum.priceDelta);
  const approvedCostDelta = numberValue(changeOrderAgg._sum.costDelta);
  const plannedRevenue = baseRevenue + approvedRevenueDelta;
  const plannedCost = basePlannedCost + approvedCostDelta;

  const materialPlannedFromProject = projectMaterials.reduce((sum, material) => {
    return sum + numberValue(material.plannedQty) * numberValue(material.plannedUnitCost);
  }, 0);
  const materialActualFromProject = projectMaterials.reduce((sum, material) => {
    const qty = numberValue(material.consumedQty) || numberValue(material.quantidadeUtilizada);
    return sum + qty * numberValue(material.actualUnitCost ?? material.plannedUnitCost);
  }, 0);
  const materialActualFromStock = numberValue(stockMaterialAgg._sum.custoTotal);
  const materialPlannedCost = materialPlannedFromProject;
  const materialActualCost = Math.max(materialActualFromProject, materialActualFromStock);
  const materialVariance = materialActualCost - materialPlannedCost;

  const directExpenseCost = numberValue(expenseAgg._sum.valor);
  const timesheetLabor = timesheetLaborRows[0];
  const timesheetLaborCost = numberValue(timesheetLabor?.totalCost);
  const timesheetHours = numberValue(timesheetLabor?.totalHours);

  const serviceOrderLaborCost = Math.max(
    numberValue(serviceOrderAgg._sum.laborTotal),
    numberValue(serviceOrderWorkEntryAgg._sum.totalCost)
  );
  const serviceOrderMaterialCost = numberValue(serviceOrderAgg._sum.materialTotal);
  const serviceOrderHours = numberValue(serviceOrderWorkEntryAgg._sum.totalMinutes) / 60;

  const laborActualHours = round2(timesheetHours + serviceOrderHours);
  const laborCost = timesheetLaborCost + serviceOrderLaborCost;
  const actualCost = directExpenseCost + laborCost + materialActualCost + serviceOrderMaterialCost;
  const committedCost = numberValue(purchaseAgg._sum.totalAmount);
  const invoicedAmount = numberValue(invoiceAgg._sum.valorTotal);
  const paidAmount = numberValue(invoiceAgg._sum.valorPago);
  const budgetUsedPct = percentage(actualCost, plannedCost);
  const invoiceCoveragePct = percentage(invoicedAmount, actualCost);
  const billingCoveragePct = percentage(paidAmount, actualCost);
  const cashGap = Math.max(0, actualCost - paidAmount);
  const progressForProjection = progressPct > 0 ? progressPct : 100;
  const estimatedAtCompletion =
    progressPct > 0 && progressPct < 100 ? round2((actualCost / progressForProjection) * 100) : round2(Math.max(actualCost, plannedCost));
  const projectedProfit = round2(plannedRevenue - estimatedAtCompletion);
  const projectedMarginPct = percentage(projectedProfit, plannedRevenue);
  const laborPlannedHours = 0;

  const alerts: ProjectHealthAlert[] = [];
  const recommendations: ProjectHealthRecommendation[] = [];

  if (budgetUsedPct >= 100) {
    addAlert(alerts, 'BUDGET_LIMIT', budgetUsedPct >= 110 ? 'CRITICAL' : 'ALERT', 'Custo real atingiu ou ultrapassou o orçamento previsto.', budgetUsedPct);
    addRecommendation(recommendations, budgetUsedPct >= 110 ? 'CRITICAL' : 'ALERT', 'Revisar escopo, custos e change orders antes de continuar gastos.', 'O projeto já consumiu o orçamento previsto.');
  } else if (budgetUsedPct >= 80) {
    addAlert(alerts, 'BUDGET_WARNING', 'WARNING', 'Custo real já passou de 80% do orçamento previsto.', budgetUsedPct);
    addRecommendation(recommendations, 'WARNING', 'Revisar próximos gastos planejados e compromissos de compra.', 'O projeto está próximo do limite de orçamento.');
  }

  if (projectedMarginPct <= 0 && plannedRevenue > 0) {
    addAlert(alerts, 'PROJECTED_LOSS', 'LOSS', 'Margem projetada indica prejuízo se o ritmo atual continuar.', projectedMarginPct);
    addRecommendation(recommendations, 'LOSS', 'Parar e revisar preço, escopo, change orders e produtividade antes de avançar.', 'A projeção aponta margem zero ou negativa.');
  } else if (projectedMarginPct < 10 && plannedRevenue > 0) {
    addAlert(alerts, 'PROJECTED_LOSS', 'ALERT', 'Margem projetada está abaixo de 10%.', projectedMarginPct);
    addRecommendation(recommendations, 'ALERT', 'Avaliar cobrança adicional ou redução de custo operacional.', 'A margem projetada está baixa para absorver imprevistos.');
  }

  if (scheduleVariancePct !== null && scheduleVariancePct <= -20) {
    addAlert(alerts, 'SCHEDULE_RISK', scheduleVariancePct <= -35 ? 'CRITICAL' : 'ALERT', 'Progresso real está abaixo do esperado pelo cronograma.', scheduleVariancePct);
    addRecommendation(recommendations, scheduleVariancePct <= -35 ? 'CRITICAL' : 'ALERT', 'Replanejar equipe, etapas e data de entrega.', 'O cronograma indica atraso antes do fechamento oficial.');
  }

  if (progressPct > 0 && laborActualHours > 0) {
    const costProgressRatio = budgetUsedPct / Math.max(progressPct, 1);
    if (costProgressRatio >= 1.35) {
      addAlert(alerts, 'LABOR_SLOWDOWN', costProgressRatio >= 1.7 ? 'CRITICAL' : 'ALERT', 'Custo consumido está alto para o progresso atual.', costProgressRatio);
      addRecommendation(recommendations, costProgressRatio >= 1.7 ? 'CRITICAL' : 'ALERT', 'Auditar horas por etapa/OS e realocar mão de obra se necessário.', 'O projeto está gastando mais rápido do que progride.');
    }
  }

  if (materialPlannedCost > 0 && materialActualCost > materialPlannedCost * 1.15) {
    addAlert(alerts, 'MATERIAL_OVERRUN', materialActualCost > materialPlannedCost * 1.35 ? 'CRITICAL' : 'ALERT', 'Material usado/comprado passou do planejado.', percentage(materialActualCost, materialPlannedCost));
    addRecommendation(recommendations, materialActualCost > materialPlannedCost * 1.35 ? 'CRITICAL' : 'ALERT', 'Conferir perdas, devoluções, compras e change orders de material.', 'O consumo de material está acima do baseline.');
  }

  if (cashGap > 0) {
    addAlert(alerts, 'CASH_GAP', cashGap > plannedCost * 0.25 && plannedCost > 0 ? 'ALERT' : 'WARNING', 'A empresa está financiando parte do projeto com caixa próprio.', cashGap);
    addRecommendation(recommendations, cashGap > plannedCost * 0.25 && plannedCost > 0 ? 'ALERT' : 'WARNING', 'Avaliar emissão de progress invoice ou cobrança de etapa/material.', 'O valor pago pelo cliente não cobre o custo real acumulado.');
  }

  if (actualCost > 0 && invoiceCoveragePct < 80) {
    addAlert(alerts, 'INVOICE_NEEDED', invoiceCoveragePct < 50 ? 'ALERT' : 'WARNING', 'Invoices emitidas não cobrem o custo real acumulado.', invoiceCoveragePct);
    addRecommendation(recommendations, invoiceCoveragePct < 50 ? 'ALERT' : 'WARNING', 'Preparar invoice parcial para cobrir custos já realizados.', 'A cobertura de faturamento está baixa para o custo atual.');
  }

  if (osMarginRiskCount > 0) {
    addAlert(alerts, 'OS_MARGIN_RISK', osMarginRiskCount > 1 ? 'ALERT' : 'WARNING', 'Há OS vinculada com risco de margem.', osMarginRiskCount);
    addRecommendation(recommendations, osMarginRiskCount > 1 ? 'ALERT' : 'WARNING', 'Abrir as OS com margem em risco e revisar custo/preço.', 'OS vinculadas podem estar pressionando a margem do projeto.');
  }

  const riskScore = resolveRiskScore(alerts);
  const sortedRecommendations = recommendations.sort((a, b) => rankRisk(b.priority) - rankRisk(a.priority));

  return {
    projetoId: projeto.id,
    numeroProjeto: projeto.numeroProjeto,
    status: projeto.status,
    progressPct,
    expectedProgressPct,
    scheduleVariancePct,
    budgetUsedPct,
    plannedRevenue: round2(plannedRevenue),
    plannedCost: round2(plannedCost),
    actualCost: round2(actualCost),
    committedCost: round2(committedCost),
    estimatedAtCompletion,
    projectedProfit,
    projectedMarginPct,
    laborPlannedHours,
    laborActualHours,
    laborCost: round2(laborCost),
    materialPlannedCost: round2(materialPlannedCost),
    materialActualCost: round2(materialActualCost),
    materialVariance: round2(materialVariance),
    invoicedAmount: round2(invoicedAmount),
    paidAmount: round2(paidAmount),
    billingCoveragePct,
    invoiceCoveragePct,
    cashGap: round2(cashGap),
    openBudgetAlerts,
    osMarginRiskCount,
    riskScore,
    alerts,
    recommendations: sortedRecommendations,
    updatedAt: now,
  };
}
