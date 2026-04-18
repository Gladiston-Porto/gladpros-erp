/**
 * ProjectFinanceService
 * 
 * Real aggregation of project costs from Expense and TimesheetEntry tables.
 * Replaces manual/stub calculations with actual database queries.
 * 
 * Data sources:
 *  - Expense (projetoId)        → material costs, overhead, vendor payments
 *  - TimesheetEntry (projectId) → labor hours (multiplied by Assignment.costRateHourly)
 *  - Assignment (projectId)     → worker cost rates
 */

import { prisma } from '@/lib/prisma';

export interface ProjectCostBreakdown {
  /** Sum of all Expense.valor where projetoId matches */
  totalExpenses: number;
  /** Sum of (TimesheetEntry.hours × Assignment.costRateHourly) where projectId matches */
  totalLabor: number;
  /** Total labor hours logged */
  totalHours: number;
  /** totalExpenses + totalLabor */
  custoReal: number;
  /** Expense breakdown by costCategory */
  expensesByCategory: Record<string, number>;
  /** Labor breakdown by worker name */
  laborByWorker: Array<{ workerName: string; hours: number; cost: number }>;
  /** Number of workers assigned */
  workerCount: number;
  /** Number of expense records */
  expenseCount: number;
}

export interface ProjectFinanceSummary extends ProjectCostBreakdown {
  projetoId: number;
  valorEstimado: number;
  custoPrevisto: number;
  margemPrevista: number;
  margemReal: number;
  lucroPrevisto: number;
  lucroReal: number;
}

/**
 * Aggregate all real costs for a project from Expense and TimesheetEntry tables.
 */
export async function aggregateProjectCosts(projetoId: number): Promise<ProjectCostBreakdown> {
  // 1. Aggregate expenses
  const [expenseAgg, expenses] = await Promise.all([
    prisma.expense.aggregate({
      where: { projetoId },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.findMany({
      where: { projetoId },
      select: { valor: true, costCategory: true },
    }),
  ]);

  const totalExpenses = Number(expenseAgg._sum.valor) || 0;
  const expenseCount = expenseAgg._count;

  // Breakdown by cost category
  const expensesByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    const cat = exp.costCategory || 'UNCATEGORIZED';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(exp.valor);
  }

  // 2. Aggregate labor costs via Timesheet → Assignment → Worker
  //    TimesheetEntry has projectId, and belongs to Timesheet → Assignment
  const timesheetEntries = await prisma.timesheetEntry.findMany({
    where: { projectId: projetoId },
    select: {
      hours: true,
      timesheet: {
        select: {
          assignment: {
            select: {
              costRateHourly: true,
              worker: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  let totalLabor = 0;
  let totalHours = 0;
  const laborMap = new Map<string, { hours: number; cost: number }>();

  for (const entry of timesheetEntries) {
    const hours = Number(entry.hours) || 0;
    const rate = Number(entry.timesheet.assignment.costRateHourly) || 0;
    const cost = hours * rate;
    const workerName = entry.timesheet.assignment.worker.name;

    totalHours += hours;
    totalLabor += cost;

    const existing = laborMap.get(workerName) || { hours: 0, cost: 0 };
    existing.hours += hours;
    existing.cost += cost;
    laborMap.set(workerName, existing);
  }

  const laborByWorker = Array.from(laborMap.entries()).map(([workerName, data]) => ({
    workerName,
    hours: data.hours,
    cost: data.cost,
  }));

  return {
    totalExpenses,
    totalLabor,
    totalHours,
    custoReal: totalExpenses + totalLabor,
    expensesByCategory,
    laborByWorker,
    workerCount: laborMap.size,
    expenseCount,
  };
}

/**
 * Get full financial summary for a project, with margins and profit calculations.
 */
export async function getProjectFinanceSummary(projetoId: number): Promise<ProjectFinanceSummary> {
  const [costs, projeto] = await Promise.all([
    aggregateProjectCosts(projetoId),
    prisma.projeto.findUnique({
      where: { id: projetoId },
      select: {
        valorEstimado: true,
        custoPrevisto: true,
      },
    }),
  ]);

  const valorEstimado = Number(projeto?.valorEstimado) || 0;
  const custoPrevisto = Number(projeto?.custoPrevisto) || 0;

  // Real margin = (revenue - cost) / revenue  × 100
  const margemPrevista = valorEstimado > 0
    ? ((valorEstimado - custoPrevisto) / valorEstimado) * 100
    : 0;

  const margemReal = valorEstimado > 0 && costs.custoReal > 0
    ? ((valorEstimado - costs.custoReal) / valorEstimado) * 100
    : 0;

  const lucroPrevisto = valorEstimado - custoPrevisto;
  const lucroReal = valorEstimado - costs.custoReal;

  return {
    projetoId,
    valorEstimado,
    custoPrevisto,
    margemPrevista,
    margemReal,
    lucroPrevisto,
    lucroReal,
    ...costs,
  };
}

/**
 * Recalculate and persist project costs to the Projeto record.
 * Call this after expense/timesheet changes to keep the Projeto.custoReal up to date.
 */
export async function syncProjectCosts(projetoId: number): Promise<ProjectFinanceSummary> {
  const summary = await getProjectFinanceSummary(projetoId);

  await prisma.projeto.update({
    where: { id: projetoId },
    data: {
      custoReal: summary.custoReal,
      margemReal: summary.margemReal,
      lucroReal: summary.lucroReal,
    },
  });

  return summary;
}
