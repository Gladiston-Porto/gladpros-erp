/**
 * ScheduleCExportService
 * Generates Schedule C-aligned reports for the accountant.
 * Supports JSON data output (Excel/PDF generation to be added in Phase 5
 * when exceljs/pdfkit dependencies are installed).
 *
 * Reference: .github/skills/financial-tax-compliance/PLAYBOOK.md
 */

import { prisma } from "@/lib/prisma"
import { calculateTax } from "./taxCalculationEngine"
import type { TipoTributacao } from "@prisma/client"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleCExportInput {
  empresaId: number
  taxYear: number
}

export interface ExpenseDetail {
  id: number
  descricao: string
  valor: number
  deductibleAmount: number
  data: string
  fornecedor: string | null
  categoria: string
}

export interface ScheduleCLineDetail {
  lineNumber: string
  lineName: string
  total: number
  items: ExpenseDetail[]
}

export interface IncomeSection {
  line1_grossReceipts: number
  line4_cogs: number
  line7_grossIncome: number
}

export interface ScheduleCReport {
  empresaName: string
  ownerName: string
  taxYear: number
  regime: TipoTributacao
  generatedAt: string
  income: IncomeSection
  expenses: ScheduleCLineDetail[]
  line28_totalExpenses: number
  line31_netProfit: number
  ownerCompensation: {
    totalDraws: number
    totalSalary: number
    totalDistributions: number
    totalCompensation: number
  }
  estimatedTax: {
    selfEmploymentTax: number
    estimatedIncomeTax: number
    totalEstimatedTax: number
  }
  quarterlyPayments: Array<{
    quarter: string
    estimatedAmount: number
    paidAmount: number
    status: string
  }>
}

// ── Main Export Function ─────────────────────────────────────────────────────

export async function generateScheduleCReport(
  input: ScheduleCExportInput
): Promise<ScheduleCReport> {
  const { empresaId, taxYear } = input

  const startOfYear = new Date(taxYear, 0, 1)
  const endOfYear = new Date(taxYear, 11, 31, 23, 59, 59)

  // Company + owner info
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { nome: true, razaoSocial: true, tipoTributacao: true },
  })

  // Look up owner worker via OwnerCompensation (Worker has no empresaId column)
  const ownerCompForTenant = await prisma.ownerCompensation.findFirst({
    where: { empresaId },
    include: { worker: { select: { name: true } } },
    orderBy: { criadoEm: 'desc' },
  })
  const ownerWorker = ownerCompForTenant?.worker ?? null

  // Tax calculation for the full year
  const taxResult = await calculateTax({
    empresaId,
    regime: empresa.tipoTributacao,
    period: { startDate: startOfYear, endDate: endOfYear },
  })

  // Detailed expenses grouped by Schedule C line
  const expenses = await prisma.expense.findMany({
    where: {
      empresaId,
      status: "PAGA",
      dataPagamento: { gte: startOfYear, lte: endOfYear },
      dedutivel: true,
    },
    select: {
      id: true,
      descricao: true,
      valor: true,
      percentualDedutivel: true,
      dataPagamento: true,
      fornecedor: { select: { nome: true } },
      categoria: { select: { nome: true, scheduleCLine: true } },
    },
    orderBy: { dataPagamento: "asc" },
  })

  // Group by line
  const lineMap = new Map<string, ScheduleCLineDetail>()
  let cogsTotal = 0

  for (const exp of expenses) {
    const lineNumber = exp.categoria.scheduleCLine ?? "Unclassified"
    const pct = exp.percentualDedutivel ?? 100
    const rawAmount = Number(exp.valor)
    const deductibleAmount = Math.round(rawAmount * (pct / 100) * 100) / 100

    if (lineNumber === "COGS") {
      cogsTotal += deductibleAmount
    }

    const detail: ExpenseDetail = {
      id: exp.id,
      descricao: exp.descricao,
      valor: rawAmount,
      deductibleAmount,
      data: exp.dataPagamento?.toISOString().split("T")[0] ?? "",
      fornecedor: exp.fornecedor?.nome ?? null,
      categoria: exp.categoria.nome,
    }

    const existing = lineMap.get(lineNumber)
    if (existing) {
      existing.total += deductibleAmount
      existing.items.push(detail)
    } else {
      lineMap.set(lineNumber, {
        lineNumber,
        lineName: exp.categoria.nome,
        total: deductibleAmount,
        items: [detail],
      })
    }
  }

  // Round totals in lineMap
  const sortedLines = Array.from(lineMap.values())
    .map((line) => ({
      ...line,
      total: Math.round(line.total * 100) / 100,
    }))
    .sort((a, b) =>
      a.lineNumber.localeCompare(b.lineNumber, undefined, { numeric: true })
    )

  // Owner compensation summary
  const [draws, salary, distributions] = await Promise.all([
    prisma.ownerCompensation.aggregate({
      where: { empresaId, tipo: "OWNER_DRAW", data: { gte: startOfYear, lte: endOfYear } },
      _sum: { valor: true },
    }),
    prisma.ownerCompensation.aggregate({
      where: { empresaId, tipo: "SALARY", data: { gte: startOfYear, lte: endOfYear } },
      _sum: { valor: true },
    }),
    prisma.ownerCompensation.aggregate({
      where: { empresaId, tipo: "DISTRIBUTION", data: { gte: startOfYear, lte: endOfYear } },
      _sum: { valor: true },
    }),
  ])

  const totalDraws = Number(draws._sum.valor ?? 0)
  const totalSalary = Number(salary._sum.valor ?? 0)
  const totalDistributions = Number(distributions._sum.valor ?? 0)

  // Quarterly payments
  const quarterlyPayments = await prisma.estimatedTaxPayment.findMany({
    where: { empresaId, taxYear },
    orderBy: { quarter: "asc" },
  })

  const line28TotalExpenses = Math.max(
    0,
    Math.round((taxResult.totalDeductibleExpenses - cogsTotal) * 100) / 100
  )
  const line31NetProfit = Math.round(
    (taxResult.grossRevenue - cogsTotal - line28TotalExpenses) * 100
  ) / 100

  return {
    empresaName: empresa.nome ?? empresa.razaoSocial ?? "GladPros",
    ownerName: ownerWorker?.name ?? "Owner",
    taxYear,
    regime: empresa.tipoTributacao,
    generatedAt: new Date().toISOString(),
    income: {
      line1_grossReceipts: taxResult.grossRevenue,
      line4_cogs: cogsTotal,
      line7_grossIncome: taxResult.grossRevenue - cogsTotal,
    },
    expenses: sortedLines,
    line28_totalExpenses: line28TotalExpenses,
    line31_netProfit: line31NetProfit,
    ownerCompensation: {
      totalDraws,
      totalSalary,
      totalDistributions,
      totalCompensation: totalDraws + totalSalary + totalDistributions,
    },
    estimatedTax: {
      selfEmploymentTax: taxResult.selfEmploymentTax,
      estimatedIncomeTax: taxResult.estimatedIncomeTax,
      totalEstimatedTax: taxResult.totalEstimatedTax,
    },
    quarterlyPayments: quarterlyPayments.map((qp) => ({
      quarter: qp.quarter,
      estimatedAmount: Number(qp.estimatedAmount),
      paidAmount: Number(qp.paidAmount),
      status: qp.status,
    })),
  }
}

// ── Contractor 1099 Summary ──────────────────────────────────────────────────

export interface Contractor1099Summary {
  contractorId: number
  workerId?: number
  fornecedorId?: number
  name: string
  classification: string
  totalPaid: number
  needs1099: boolean // true if >= $600
}

export async function getContractor1099Summary(
  empresaId: number,
  taxYear: number
): Promise<Contractor1099Summary[]> {
  const startOfYear = new Date(taxYear, 0, 1)
  const endOfYear = new Date(taxYear, 11, 31, 23, 59, 59)

  const contractLaborCategory = await prisma.expenseCategory.findFirst({
    where: { empresaId, slug: "contract-labor" },
    select: { id: true },
  })

  if (!contractLaborCategory) {
    return []
  }

  const contractorPayments = await prisma.expense.findMany({
    where: {
      empresaId,
      status: "PAGA",
      dataPagamento: { gte: startOfYear, lte: endOfYear },
      categoriaId: contractLaborCategory.id,
      OR: [
        { fornecedorId: { not: null } },
        { observacoes: { contains: "Worker #" } },
      ],
    },
    select: {
      valor: true,
      descricao: true,
      observacoes: true,
      fornecedor: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  })

  const totalsByFornecedor = new Map<number, Contractor1099Summary>()

  for (const payment of contractorPayments) {
    const workerMatch = payment.observacoes?.match(/Worker #(\d+)/)
    const contractorId = payment.fornecedor?.id ?? (workerMatch ? Number(workerMatch[1]) : null)
    if (!contractorId) continue

    const existing = totalsByFornecedor.get(contractorId)
    const totalPaid = (existing?.totalPaid ?? 0) + Number(payment.valor)

    totalsByFornecedor.set(contractorId, {
      contractorId,
      fornecedorId: payment.fornecedor?.id,
      workerId: payment.fornecedor ? undefined : contractorId,
      name: payment.fornecedor?.nome ?? payment.descricao.replace(/^Pagamento Worker:\s*/i, ""),
      classification: "CONTRACTOR_1099",
      totalPaid: Math.round(totalPaid * 100) / 100,
      needs1099: totalPaid >= 600,
    })
  }

  return Array.from(totalsByFornecedor.values()).filter((r) => r.totalPaid > 0)
}
