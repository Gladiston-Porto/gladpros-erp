/**
 * OwnerCompensationService
 * Manages owner draws (LLC), salary and distributions (S-Corp)
 * with regime-appropriate validation.
 *
 * Reference: .github/skills/financial-tax-compliance/PLAYBOOK.md
 */

import { prisma } from "@/lib/prisma"
import type { TipoCompensacao } from "@prisma/client"

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateCompensationInput {
  empresaId: number
  workerId: number
  tipo: TipoCompensacao
  valor: number
  data: Date
  descricao?: string
  referencia?: string
  bankAccountId?: number
  criadoPor: number
}

export interface CompensationFilters {
  empresaId: number
  year?: number
  tipo?: TipoCompensacao
  page?: number
  pageSize?: number
}

export interface CompensationSummary {
  year: number
  totalDraws: number
  totalSalary: number
  totalDistributions: number
  totalCompensation: number
  regime: string
}

export interface CompensationValidationError {
  code: string
  message: string
}

// ── Validation ───────────────────────────────────────────────────────────────

async function validateCompensation(
  input: CreateCompensationInput
): Promise<CompensationValidationError | null> {
  // 1. Verify worker is OWNER_OPERATOR
  const worker = await prisma.worker.findUnique({
    where: { id: input.workerId },
    select: { classification: true },
  })

  if (!worker) {
    return { code: "WORKER_NOT_FOUND", message: "Trabalhador não encontrado" }
  }

  if (worker.classification !== "OWNER_OPERATOR") {
    return {
      code: "NOT_OWNER",
      message: "Apenas o owner/operator pode receber compensações nesta categoria",
    }
  }

  // 2. Check empresa regime
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: input.empresaId },
    select: { tipoTributacao: true },
  })

  const regime = empresa.tipoTributacao

  // 3. LLC → only OWNER_DRAW
  if (regime === "LLC_DEFAULT" && input.tipo !== "OWNER_DRAW") {
    return {
      code: "LLC_INVALID_TYPE",
      message: `No regime LLC, apenas Owner Draw é permitido. Tipo "${input.tipo}" não é válido.`,
    }
  }

  // 4. S-Corp → SALARY or DISTRIBUTION (never OWNER_DRAW)
  if (regime === "S_CORP" && input.tipo === "OWNER_DRAW") {
    return {
      code: "SCORP_NO_DRAW",
      message: "No regime S-Corp, Owner Draw não é permitido. Use Salary ou Distribution.",
    }
  }

  // 5. S-Corp + DISTRIBUTION → must have SALARY in current year
  if (regime === "S_CORP" && input.tipo === "DISTRIBUTION") {
    const year = input.data.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const salaryCount = await prisma.ownerCompensation.count({
      where: {
        empresaId: input.empresaId,
        tipo: "SALARY",
        data: { gte: startOfYear, lte: endOfYear },
      },
    })

    if (salaryCount === 0) {
      return {
        code: "SCORP_SALARY_REQUIRED",
        message:
          "S-Corp: é necessário ter pelo menos um pagamento de Salary antes de fazer Distribution. O IRS exige reasonable compensation.",
      }
    }
  }

  // 6. Validate valor > 0
  if (input.valor <= 0) {
    return { code: "INVALID_AMOUNT", message: "O valor deve ser maior que zero" }
  }

  return null
}

// ── Warnings (non-blocking) ─────────────────────────────────────────────────

export interface CompensationWarning {
  code: string
  message: string
  severity: "info" | "warning"
}

async function getCompensationWarnings(
  input: CreateCompensationInput
): Promise<CompensationWarning[]> {
  const warnings: CompensationWarning[] = []

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: input.empresaId },
    select: { tipoTributacao: true },
  })

  if (empresa.tipoTributacao !== "S_CORP") return warnings

  // Check reasonable salary rule for S-Corp
  const year = input.data.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31, 23, 59, 59)

  const [salaryAgg, distributionAgg] = await Promise.all([
    prisma.ownerCompensation.aggregate({
      where: {
        empresaId: input.empresaId,
        tipo: "SALARY",
        data: { gte: startOfYear, lte: endOfYear },
      },
      _sum: { valor: true },
    }),
    prisma.ownerCompensation.aggregate({
      where: {
        empresaId: input.empresaId,
        tipo: "DISTRIBUTION",
        data: { gte: startOfYear, lte: endOfYear },
      },
      _sum: { valor: true },
    }),
  ])

  const totalSalary = Number(salaryAgg._sum.valor ?? 0) +
    (input.tipo === "SALARY" ? input.valor : 0)
  const totalDistribution = Number(distributionAgg._sum.valor ?? 0) +
    (input.tipo === "DISTRIBUTION" ? input.valor : 0)
  const totalComp = totalSalary + totalDistribution

  if (totalComp > 0 && totalSalary / totalComp < 0.3) {
    warnings.push({
      code: "LOW_SALARY_RATIO",
      severity: "warning",
      message: `Salary representa apenas ${Math.round((totalSalary / totalComp) * 100)}% da compensação total. O IRS recomenda pelo menos 30-40% como "reasonable compensation".`,
    })
  }

  return warnings
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createCompensation(input: CreateCompensationInput) {
  // Validate
  const error = await validateCompensation(input)
  if (error) {
    return { success: false as const, error }
  }

  // Get warnings
  const warnings = await getCompensationWarnings(input)

  // Create
  const compensation = await prisma.ownerCompensation.create({
    data: {
      empresaId: input.empresaId,
      workerId: input.workerId,
      tipo: input.tipo,
      valor: input.valor,
      data: input.data,
      descricao: input.descricao ?? null,
      referencia: input.referencia ?? null,
      bankAccountId: input.bankAccountId ?? null,
      criadoPor: input.criadoPor,
    },
    include: {
      worker: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, nome: true } },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: input.criadoPor,
      entidade: "OwnerCompensation",
      entidadeId: String(compensation.id),
      acao: "CREATE",
      diff: JSON.stringify({
        tipo: input.tipo,
        valor: input.valor,
        data: input.data.toISOString(),
      }),
    },
  })

  return { success: true as const, data: compensation, warnings }
}

export async function listCompensations(filters: CompensationFilters) {
  const { empresaId, year, tipo, page = 1, pageSize = 20 } = filters

  const where: Record<string, unknown> = {
    empresaId,
  }

  if (year) {
    where.data = {
      gte: new Date(year, 0, 1),
      lte: new Date(year, 11, 31, 23, 59, 59),
    }
  }

  if (tipo) {
    where.tipo = tipo
  }

  const [items, total] = await Promise.all([
    prisma.ownerCompensation.findMany({
      where,
      orderBy: { data: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        worker: { select: { id: true, name: true } },
        bankAccount: { select: { id: true, nome: true } },
      },
    }),
    prisma.ownerCompensation.count({ where }),
  ])

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getCompensationSummary(
  empresaId: number,
  year: number
): Promise<CompensationSummary> {
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31, 23, 59, 59)

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

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { tipoTributacao: true },
  })

  const totalDraws = Number(draws._sum.valor ?? 0)
  const totalSalary = Number(salary._sum.valor ?? 0)
  const totalDistributions = Number(distributions._sum.valor ?? 0)

  return {
    year,
    totalDraws,
    totalSalary,
    totalDistributions,
    totalCompensation: totalDraws + totalSalary + totalDistributions,
    regime: empresa.tipoTributacao,
  }
}

export async function deleteCompensation(id: number, userId: number) {
  const compensation = await prisma.ownerCompensation.findUnique({
    where: { id },
  })

  if (!compensation) {
    return { success: false as const, error: { code: "NOT_FOUND", message: "Compensação não encontrada" } }
  }

  await prisma.ownerCompensation.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      entidade: "OwnerCompensation",
      entidadeId: String(id),
      acao: "DELETE",
      diff: JSON.stringify({
        tipo: compensation.tipo,
        valor: Number(compensation.valor),
        data: compensation.data.toISOString(),
      }),
    },
  })

  return { success: true as const }
}
