/**
 * TaxCalculationEngine
 * Calculates taxable income, self-employment tax, and estimated tax
 * based on the current tax regime (LLC or S-Corp).
 *
 * Reference: .github/skills/financial-tax-compliance/PLAYBOOK.md
 */

import { prisma } from "@/lib/prisma"
import type { TipoTributacao } from "@prisma/client"

// ── Types ────────────────────────────────────────────────────────────────────

export interface TaxCalculationInput {
  empresaId: number
  regime: TipoTributacao
  period: { startDate: Date; endDate: Date }
}

export interface ScheduleCLineItem {
  lineNumber: string
  lineName: string
  total: number
}

export interface TaxCalculationResult {
  grossRevenue: number
  totalDeductibleExpenses: number
  netIncome: number
  ownerSalaryYTD: number
  selfEmploymentTax: number
  estimatedIncomeTax: number
  totalEstimatedTax: number
  quarterlyPaymentTarget: number
  expensesByScheduleCLine: ScheduleCLineItem[]
}

// ── US 2026 Federal Tax Brackets (Single / MFJ simplified) ──────────────────

const FEDERAL_BRACKETS_2026 = [
  { min: 0, max: 11_925, rate: 0.10 },
  { min: 11_925, max: 48_475, rate: 0.12 },
  { min: 48_475, max: 103_350, rate: 0.22 },
  { min: 103_350, max: 197_300, rate: 0.24 },
  { min: 197_300, max: 250_525, rate: 0.32 },
  { min: 250_525, max: 626_350, rate: 0.35 },
  { min: 626_350, max: Infinity, rate: 0.37 },
]

// Self-employment tax constants  
const SE_TAX_RATE = 0.153 // 15.3% (12.4% SS + 2.9% Medicare)
const SE_ADJUSTMENT_FACTOR = 0.9235 // 92.35% of net income subject to SE tax
const SE_DEDUCTION_FACTOR = 0.5 // 50% of SE tax is deductible from income tax

// ── Helpers ──────────────────────────────────────────────────────────────────

function calculateFederalIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  for (const bracket of FEDERAL_BRACKETS_2026) {
    if (taxableIncome <= bracket.min) break
    const taxable = Math.min(taxableIncome, bracket.max) - bracket.min
    tax += taxable * bracket.rate
  }
  return Math.round(tax * 100) / 100
}

function calculateSelfEmploymentTax(netIncome: number): number {
  if (netIncome <= 0) return 0
  const seBase = netIncome * SE_ADJUSTMENT_FACTOR
  return Math.round(seBase * SE_TAX_RATE * 100) / 100
}

// ── Main Engine ──────────────────────────────────────────────────────────────

export async function calculateTax(
  input: TaxCalculationInput
): Promise<TaxCalculationResult> {
  const { empresaId, regime, period } = input

  // 1. Gross Revenue — sum of all RECEBIDA revenue in the period
  const revenueAgg = await prisma.revenue.aggregate({
    where: {
      empresaId,
      status: "RECEBIDA",
      dataPagamento: { gte: period.startDate, lte: period.endDate },
    },
    _sum: { valor: true },
  })
  const grossRevenue = Number(revenueAgg._sum.valor ?? 0)

  // 2. Deductible Expenses — PAGA expenses where dedutivel=true
  const expenses = await prisma.expense.findMany({
    where: {
      empresaId,
      status: "PAGA",
      dataPagamento: { gte: period.startDate, lte: period.endDate },
      dedutivel: true,
    },
    select: {
      valor: true,
      percentualDedutivel: true,
      categoria: {
        select: {
          scheduleCLine: true,
          nome: true,
        },
      },
    },
  })

  // 3. Calculate line-by-line totals
  const lineMap = new Map<string, { lineName: string; total: number }>()

  let totalDeductibleExpenses = 0
  for (const exp of expenses) {
    const rawAmount = Number(exp.valor)
    const pct = exp.percentualDedutivel ?? 100
    const deductibleAmount = Math.round(rawAmount * (pct / 100) * 100) / 100

    totalDeductibleExpenses += deductibleAmount

    const lineNumber = exp.categoria.scheduleCLine ?? "Unclassified"
    const existing = lineMap.get(lineNumber)
    if (existing) {
      existing.total += deductibleAmount
    } else {
      lineMap.set(lineNumber, {
        lineName: exp.categoria.nome,
        total: deductibleAmount,
      })
    }
  }

  // Round totals
  totalDeductibleExpenses = Math.round(totalDeductibleExpenses * 100) / 100
  const expensesByScheduleCLine: ScheduleCLineItem[] = Array.from(
    lineMap.entries()
  )
    .map(([lineNumber, data]) => ({
      lineNumber,
      lineName: data.lineName,
      total: Math.round(data.total * 100) / 100,
    }))
    .sort((a, b) => a.lineNumber.localeCompare(b.lineNumber, undefined, { numeric: true }))

  // 4. Net Income
  const netIncome = Math.round((grossRevenue - totalDeductibleExpenses) * 100) / 100

  // 5. Owner salary YTD (S-Corp only)
  let ownerSalaryYTD = 0
  if (regime === "S_CORP") {
    const salaryAgg = await prisma.ownerCompensation.aggregate({
      where: {
        empresaId,
        tipo: "SALARY",
        data: { gte: period.startDate, lte: period.endDate },
      },
      _sum: { valor: true },
    })
    ownerSalaryYTD = Number(salaryAgg._sum.valor ?? 0)
  }

  // 6. Self-Employment Tax (LLC only)
  const selfEmploymentTax = regime === "LLC_DEFAULT"
    ? calculateSelfEmploymentTax(netIncome)
    : 0

  // 7. Estimated Income Tax
  const taxableForIncomeTax = regime === "LLC_DEFAULT"
    ? netIncome - selfEmploymentTax * SE_DEDUCTION_FACTOR
    : netIncome - ownerSalaryYTD

  const estimatedIncomeTax = calculateFederalIncomeTax(
    Math.max(0, taxableForIncomeTax)
  )

  // 8. Total estimated tax
  const totalEstimatedTax = Math.round(
    (estimatedIncomeTax + selfEmploymentTax) * 100
  ) / 100

  const quarterlyPaymentTarget = Math.round(
    (totalEstimatedTax / 4) * 100
  ) / 100

  return {
    grossRevenue,
    totalDeductibleExpenses,
    netIncome,
    ownerSalaryYTD,
    selfEmploymentTax,
    estimatedIncomeTax,
    totalEstimatedTax,
    quarterlyPaymentTarget,
    expensesByScheduleCLine,
  }
}

// ── Convenience: YTD calculation ─────────────────────────────────────────────

export async function calculateYTDTax(
  empresaId: number
): Promise<TaxCalculationResult> {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { tipoTributacao: true },
  })

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  return calculateTax({
    empresaId,
    regime: empresa.tipoTributacao,
    period: { startDate: startOfYear, endDate: now },
  })
}

// ── Annualized estimate (for quarterly projections) ──────────────────────────

export async function calculateAnnualizedEstimate(
  empresaId: number
): Promise<TaxCalculationResult & { annualizationFactor: number }> {
  const ytd = await calculateYTDTax(empresaId)

  const now = new Date()
  const monthsElapsed = now.getMonth() + 1 // Jan=1, Dec=12
  const annualizationFactor = 12 / monthsElapsed

  return {
    ...ytd,
    grossRevenue: Math.round(ytd.grossRevenue * annualizationFactor * 100) / 100,
    totalDeductibleExpenses: Math.round(ytd.totalDeductibleExpenses * annualizationFactor * 100) / 100,
    netIncome: Math.round(ytd.netIncome * annualizationFactor * 100) / 100,
    selfEmploymentTax: Math.round(ytd.selfEmploymentTax * annualizationFactor * 100) / 100,
    estimatedIncomeTax: Math.round(ytd.estimatedIncomeTax * annualizationFactor * 100) / 100,
    totalEstimatedTax: Math.round(ytd.totalEstimatedTax * annualizationFactor * 100) / 100,
    quarterlyPaymentTarget: Math.round(ytd.totalEstimatedTax * annualizationFactor / 4 * 100) / 100,
    annualizationFactor,
  }
}
