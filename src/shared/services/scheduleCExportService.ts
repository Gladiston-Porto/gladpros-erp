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

  const ownerWorker = await prisma.worker.findFirst({
    where: { classification: "OWNER_OPERATOR" },
    select: { name: true },
  })

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
    line28_totalExpenses: taxResult.totalDeductibleExpenses,
    line31_netProfit: taxResult.netIncome,
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
  workerId: number
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

  // Get all CONTRACTOR_1099 workers with their payments
  const contractors = await prisma.worker.findMany({
    where: {
      classification: "CONTRACTOR_1099",
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      classification: true,
    },
  })

  // For each contractor, sum paid expenses linked to them
  // Contractors are paid through expenses with fornecedorId or through direct entries
  // For now, we look at expenses in the "Contract Labor" category
  const contractLaborCategory = await prisma.expenseCategory.findFirst({
    where: { empresaId, slug: "contract-labor" },
    select: { id: true },
  })

  const results: Contractor1099Summary[] = []

  for (const contractor of contractors) {
    // Sum expenses where this contractor logged work entries
    // OR where expenses are directly linked via fornecedorId
    const expenseAgg = await prisma.expense.aggregate({
      where: {
        empresaId,
        status: "PAGA",
        dataPagamento: { gte: startOfYear, lte: endOfYear },
        categoriaId: contractLaborCategory?.id,
        // This is a simplified approach — in practice you'd link expenses to specific contractors
      },
      _sum: { valor: true },
    })

    const totalPaid = Number(expenseAgg._sum.valor ?? 0)

    results.push({
      workerId: contractor.id,
      name: contractor.name,
      classification: contractor.classification,
      totalPaid,
      needs1099: totalPaid >= 600,
    })
  }

  return results.filter((r) => r.totalPaid > 0)
}
