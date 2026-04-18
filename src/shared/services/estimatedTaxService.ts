/**
 * EstimatedTaxService
 * Tracks quarterly estimated tax payments (Form 1040-ES)
 * and generates alerts for upcoming/overdue payments.
 *
 * Reference: .github/skills/financial-tax-compliance/PLAYBOOK.md
 */

import { prisma } from "@/lib/prisma"
import { calculateAnnualizedEstimate } from "./taxCalculationEngine"
import type { QuarterLabel, EstimatedTaxStatus } from "@prisma/client"

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuarterlyEstimate {
  id: number | null
  quarter: QuarterLabel
  dueDate: Date
  estimatedAmount: number
  paidAmount: number
  status: EstimatedTaxStatus
  daysUntilDue: number
  alertLevel: "none" | "info" | "warning" | "critical"
}

export interface FiscalAlert {
  id: string
  type: "estimated_tax" | "reasonable_salary" | "regime_reminder"
  severity: "info" | "warning" | "critical"
  title: string
  message: string
  actionUrl?: string
  quarter?: QuarterLabel
}

// ── Quarter Due Dates ────────────────────────────────────────────────────────

const QUARTER_DUE_DATES: Record<QuarterLabel, { month: number; day: number }> = {
  Q1: { month: 3, day: 15 },  // Apr 15
  Q2: { month: 5, day: 15 },  // Jun 15
  Q3: { month: 8, day: 15 },  // Sep 15
  Q4: { month: 0, day: 15 },  // Jan 15 (next year)
}

function getDueDate(quarter: QuarterLabel, taxYear: number): Date {
  const cfg = QUARTER_DUE_DATES[quarter]
  const year = quarter === "Q4" ? taxYear + 1 : taxYear
  return new Date(year, cfg.month, cfg.day)
}

function getDaysUntilDue(dueDate: Date): number {
  const now = new Date()
  const diff = dueDate.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getAlertLevel(
  status: EstimatedTaxStatus,
  daysUntilDue: number
): "none" | "info" | "warning" | "critical" {
  if (status === "PAID") return "none"
  if (status === "OVERDUE" || daysUntilDue < 0) return "critical"
  if (daysUntilDue <= 7) return "critical"
  if (daysUntilDue <= 30) return "warning"
  if (daysUntilDue <= 60) return "info"
  return "none"
}

function deriveStatus(
  estimatedAmount: number,
  paidAmount: number,
  dueDate: Date
): EstimatedTaxStatus {
  if (paidAmount >= estimatedAmount && estimatedAmount > 0) return "PAID"
  if (paidAmount > 0 && paidAmount < estimatedAmount) {
    return new Date() > dueDate ? "OVERDUE" : "PARTIAL"
  }
  if (new Date() > dueDate && estimatedAmount > 0) return "OVERDUE"
  return "PENDING"
}

// ── Core ─────────────────────────────────────────────────────────────────────

export async function getQuarterlyEstimates(
  empresaId: number,
  taxYear: number
): Promise<QuarterlyEstimate[]> {
  // Get annualized estimate for quarterly target
  const annualized = await calculateAnnualizedEstimate(empresaId)

  // Get existing payment records
  const existingPayments = await prisma.estimatedTaxPayment.findMany({
    where: { empresaId, taxYear },
  })

  const paymentMap = new Map<QuarterLabel, (typeof existingPayments)[number]>(
    existingPayments.map((p) => [p.quarter, p])
  )

  const quarters: QuarterLabel[] = ["Q1", "Q2", "Q3", "Q4"]

  return quarters.map((quarter) => {
    const dueDate = getDueDate(quarter, taxYear)
    const existing = paymentMap.get(quarter)
    const estimatedAmount = annualized.quarterlyPaymentTarget
    const paidAmount = existing ? Number(existing.paidAmount) : 0
    const status = existing?.status ?? deriveStatus(estimatedAmount, paidAmount, dueDate)
    const daysUntilDue = getDaysUntilDue(dueDate)
    const alertLevel = getAlertLevel(status, daysUntilDue)

    return {
      id: existing?.id ?? null,
      quarter,
      dueDate,
      estimatedAmount,
      paidAmount,
      status,
      daysUntilDue,
      alertLevel,
    }
  })
}

// ── Record / Update Payment ──────────────────────────────────────────────────

export interface RecordPaymentInput {
  empresaId: number
  taxYear: number
  quarter: QuarterLabel
  paidAmount: number
  paidDate?: Date
  notas?: string
  userId: number
}

export async function recordPayment(input: RecordPaymentInput) {
  const { empresaId, taxYear, quarter, paidAmount, paidDate, notas, userId } = input

  if (paidAmount < 0) {
    return { success: false as const, error: "O valor pago não pode ser negativo" }
  }

  const dueDate = getDueDate(quarter, taxYear)

  // Get the estimated amount for this quarter
  const annualized = await calculateAnnualizedEstimate(empresaId)
  const estimatedAmount = annualized.quarterlyPaymentTarget

  // Derive status
  const status = deriveStatus(estimatedAmount, paidAmount, dueDate)

  const payment = await prisma.estimatedTaxPayment.upsert({
    where: {
      empresaId_taxYear_quarter: { empresaId, taxYear, quarter },
    },
    create: {
      empresaId,
      taxYear,
      quarter,
      dueDate,
      estimatedAmount,
      paidAmount,
      paidDate: paidDate ?? new Date(),
      status,
      notas: notas ?? null,
      criadoPor: userId,
    },
    update: {
      paidAmount,
      paidDate: paidDate ?? new Date(),
      status,
      notas: notas ?? null,
    },
  })

  // Audit
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      entidade: "EstimatedTaxPayment",
      entidadeId: String(payment.id),
      acao: "UPSERT",
      diff: JSON.stringify({
        quarter,
        taxYear,
        paidAmount,
        status,
      }),
    },
  })

  return { success: true as const, data: payment }
}

// ── Update existing payment ──────────────────────────────────────────────────

export async function updatePayment(
  id: number,
  data: { paidAmount?: number; paidDate?: Date; notas?: string },
  userId: number
) {
  const existing = await prisma.estimatedTaxPayment.findUnique({
    where: { id },
  })

  if (!existing) {
    return { success: false as const, error: "Pagamento não encontrado" }
  }

  const newPaidAmount = data.paidAmount ?? Number(existing.paidAmount)
  const dueDate = existing.dueDate
  const estimatedAmount = Number(existing.estimatedAmount)
  const status = deriveStatus(estimatedAmount, newPaidAmount, dueDate)

  const updated = await prisma.estimatedTaxPayment.update({
    where: { id },
    data: {
      paidAmount: data.paidAmount,
      paidDate: data.paidDate,
      notas: data.notas,
      status,
    },
  })

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      entidade: "EstimatedTaxPayment",
      entidadeId: String(id),
      acao: "UPDATE",
      diff: JSON.stringify({
        paidAmount: newPaidAmount,
        status,
      }),
    },
  })

  return { success: true as const, data: updated }
}

// ── Fiscal Alerts ────────────────────────────────────────────────────────────

export async function getFiscalAlerts(empresaId: number): Promise<FiscalAlert[]> {
  const alerts: FiscalAlert[] = []
  const now = new Date()
  const currentYear = now.getFullYear()

  // 1. Estimated tax alerts
  const quarters = await getQuarterlyEstimates(empresaId, currentYear)
  for (const q of quarters) {
    if (q.alertLevel === "critical") {
      alerts.push({
        id: `est-tax-${q.quarter}-critical`,
        type: "estimated_tax",
        severity: "critical",
        title: q.daysUntilDue < 0
          ? `Estimated Tax ${q.quarter} Vencido`
          : `Estimated Tax ${q.quarter} — ${q.daysUntilDue} dias`,
        message: q.daysUntilDue < 0
          ? `O pagamento de estimated tax do ${q.quarter} está vencido há ${Math.abs(q.daysUntilDue)} dias. Penalidades podem ser aplicadas.`
          : `O pagamento de estimated tax do ${q.quarter} vence em ${q.daysUntilDue} dias (${q.dueDate.toLocaleDateString("en-US")}).`,
        actionUrl: "/financeiro/estimated-tax",
        quarter: q.quarter,
      })
    } else if (q.alertLevel === "warning") {
      alerts.push({
        id: `est-tax-${q.quarter}-warning`,
        type: "estimated_tax",
        severity: "warning",
        title: `Estimated Tax ${q.quarter} — ${q.daysUntilDue} dias`,
        message: `Pagamento do ${q.quarter} vence em ${q.daysUntilDue} dias. Valor estimado: $${q.estimatedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
        actionUrl: "/financeiro/estimated-tax",
        quarter: q.quarter,
      })
    }
  }

  // 2. S-Corp reasonable salary check
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { tipoTributacao: true },
  })

  if (empresa.tipoTributacao === "S_CORP") {
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

    const [salaryAgg, distAgg] = await Promise.all([
      prisma.ownerCompensation.aggregate({
        where: { empresaId, tipo: "SALARY", data: { gte: startOfYear, lte: endOfYear } },
        _sum: { valor: true },
      }),
      prisma.ownerCompensation.aggregate({
        where: { empresaId, tipo: "DISTRIBUTION", data: { gte: startOfYear, lte: endOfYear } },
        _sum: { valor: true },
      }),
    ])

    const salary = Number(salaryAgg._sum.valor ?? 0)
    const dist = Number(distAgg._sum.valor ?? 0)

    if (dist > 0 && salary === 0) {
      alerts.push({
        id: "scorp-no-salary",
        type: "reasonable_salary",
        severity: "critical",
        title: "S-Corp: Salary Obrigatório",
        message:
          "Você possui distributions mas nenhum salary registrado no ano. O IRS exige reasonable compensation antes de distributions.",
        actionUrl: "/financeiro/owner-compensation",
      })
    } else if (salary + dist > 0 && salary / (salary + dist) < 0.3) {
      alerts.push({
        id: "scorp-low-salary",
        type: "reasonable_salary",
        severity: "warning",
        title: "S-Corp: Salary Ratio Baixo",
        message: `Salary é apenas ${Math.round((salary / (salary + dist)) * 100)}% da compensação total. Recomendado: ≥30%.`,
        actionUrl: "/financeiro/owner-compensation",
      })
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}
