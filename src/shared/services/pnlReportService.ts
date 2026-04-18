/**
 * PnLReportService
 * Generates Profit & Loss data aligned with Schedule C,
 * supporting annual, quarterly, and monthly breakdowns.
 */

import { prisma } from "@/lib/prisma"
import type { PnLData } from "./reportExportService"

interface PnLInput {
  empresaId: number
  taxYear: number
  period: "annual" | "quarterly" | "monthly"
}

// Period boundaries
function getPeriodBoundaries(year: number, period: "annual" | "quarterly" | "monthly") {
  const boundaries: Array<{ label: string; start: Date; end: Date }> = []

  if (period === "annual") {
    boundaries.push({
      label: String(year),
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
    })
  } else if (period === "quarterly") {
    boundaries.push(
      { label: "Q1", start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59) },
      { label: "Q2", start: new Date(year, 3, 1), end: new Date(year, 5, 30, 23, 59, 59) },
      { label: "Q3", start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59) },
      { label: "Q4", start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59) }
    )
  } else {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for (let m = 0; m < 12; m++) {
      const lastDay = new Date(year, m + 1, 0).getDate()
      boundaries.push({
        label: monthNames[m],
        start: new Date(year, m, 1),
        end: new Date(year, m, lastDay, 23, 59, 59),
      })
    }
  }

  return boundaries
}

async function getRevenueForPeriod(empresaId: number, start: Date, end: Date): Promise<number> {
  const result = await prisma.revenue.aggregate({
    where: {
      empresaId,
      status: "RECEBIDA",
      dataPagamento: { gte: start, lte: end },
    },
    _sum: { valor: true },
  })
  return Number(result._sum?.valor ?? 0)
}

async function getExpensesByCategoryForPeriod(
  empresaId: number,
  start: Date,
  end: Date
): Promise<Array<{ category: string; scheduleCLine: string | null; total: number }>> {
  const expenses = await prisma.expense.findMany({
    where: {
      empresaId,
      status: "PAGA",
      dataPagamento: { gte: start, lte: end },
    },
    select: {
      valor: true,
      percentualDedutivel: true,
      categoria: {
        select: { nome: true, scheduleCLine: true },
      },
    },
  })

  const categoryMap = new Map<string, { scheduleCLine: string | null; total: number }>()

  for (const exp of expenses) {
    const key = exp.categoria.nome
    const existing = categoryMap.get(key)
    const pct = exp.percentualDedutivel ?? 100
    const deductible = Math.round(Number(exp.valor) * (pct / 100) * 100) / 100

    if (existing) {
      existing.total += deductible
    } else {
      categoryMap.set(key, {
        scheduleCLine: exp.categoria.scheduleCLine,
        total: deductible,
      })
    }
  }

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => (a.scheduleCLine ?? "ZZZ").localeCompare(b.scheduleCLine ?? "ZZZ", undefined, { numeric: true }))
}

export async function generatePnLReport(input: PnLInput): Promise<PnLData> {
  const { empresaId, taxYear, period } = input
  const boundaries = getPeriodBoundaries(taxYear, period)

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { nome: true, razaoSocial: true },
  })

  const columnHeaders = boundaries.map((b) => b.label)

  // Revenue per period
  const revenueByPeriod: number[] = []
  for (const b of boundaries) {
    const rev = await getRevenueForPeriod(empresaId, b.start, b.end)
    revenueByPeriod.push(rev)
  }

  // Gather all unique categories across periods
  const allCategoriesSet = new Set<string>()
  const expensesByPeriod: Array<Map<string, number>> = []

  for (const b of boundaries) {
    const cats = await getExpensesByCategoryForPeriod(empresaId, b.start, b.end)
    const map = new Map<string, number>()
    for (const c of cats) {
      allCategoriesSet.add(c.category)
      map.set(c.category, c.total)
    }
    expensesByPeriod.push(map)
  }

  const allCategories = Array.from(allCategoriesSet).sort()

  // Build expense rows
  const expenseRows = allCategories.map((cat) => ({
    description: cat,
    amounts: expensesByPeriod.map((m) => m.get(cat) ?? 0),
  }))

  const expenseSubtotals = boundaries.map((_, i) =>
    expenseRows.reduce((sum, row) => sum + row.amounts[i], 0)
  )

  const netProfit = revenueByPeriod.map((rev, i) => rev - expenseSubtotals[i])

  return {
    empresaName: empresa.nome ?? empresa.razaoSocial ?? "GladPros",
    taxYear,
    period,
    generatedAt: new Date().toISOString(),
    columnHeaders,
    sections: [
      {
        label: "Revenue",
        rows: [{ description: "Gross Receipts", amounts: revenueByPeriod }],
        subtotal: revenueByPeriod,
      },
      {
        label: "Expenses",
        rows: expenseRows,
        subtotal: expenseSubtotals,
      },
    ],
    netProfit,
  }
}
