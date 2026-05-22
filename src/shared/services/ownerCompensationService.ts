/**
 * OwnerCompensationService
 * Manages owner draws (LLC), salary and distributions (S-Corp)
 * with regime-appropriate validation.
 *
 * Reference: .github/skills/financial-tax-compliance/PLAYBOOK.md
 */

import { prisma } from "@/lib/prisma"
import type { TipoCompensacao } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { postLedgerTransaction } from "./ledgerPostingService"

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

const COMPENSATION_LABEL: Record<TipoCompensacao, string> = {
  OWNER_DRAW: "Owner Draw",
  SALARY: "Owner Salary",
  DISTRIBUTION: "Owner Distribution",
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

  if (!input.bankAccountId) {
    return {
      success: false as const,
      error: {
        code: "BANK_ACCOUNT_REQUIRED",
        message: "Conta bancária é obrigatória para registrar compensação do proprietário",
      },
    }
  }

  // Get warnings
  const warnings = await getCompensationWarnings(input)

  const result = await prisma.$transaction(async (tx) => {
    let saldoAnterior: Decimal | null = null
    let saldoPosterior: Decimal | null = null

    const account = await tx.bankAccount.findFirst({
      where: {
        id: input.bankAccountId,
        empresaId: input.empresaId,
        ativo: true,
      },
      select: {
        id: true,
        saldoAtual: true,
      },
    })

    if (!account) {
      return {
        success: false as const,
        error: {
          code: "BANK_ACCOUNT_NOT_FOUND",
          message: "Conta bancária não encontrada ou inativa para esta empresa",
        },
      }
    }

    const currentBalance = new Decimal(account.saldoAtual)
    const amount = new Decimal(input.valor)
    if (currentBalance.lt(amount)) {
      return {
        success: false as const,
        error: {
          code: "INSUFFICIENT_BANK_BALANCE",
          message: "Saldo bancário insuficiente para registrar esta compensação",
        },
      }
    }

    const compensation = await tx.ownerCompensation.create({
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

    if (account) {
      const debited = await tx.bankAccount.updateMany({
        where: {
          id: input.bankAccountId,
          empresaId: input.empresaId,
          ativo: true,
          saldoAtual: { gte: new Decimal(input.valor) },
        },
        data: { saldoAtual: { decrement: new Decimal(input.valor) } },
      })

      if (debited.count !== 1) {
        throw new Error("Saldo bancário insuficiente ou conta alterada durante a compensação")
      }

      const updatedAccount = await tx.bankAccount.findUniqueOrThrow({
        where: { id: input.bankAccountId },
        select: { saldoAtual: true },
      })
      saldoPosterior = new Decimal(updatedAccount.saldoAtual)
      saldoAnterior = saldoPosterior.plus(amount)

      await tx.bankTransaction.create({
        data: {
          accountId: input.bankAccountId,
          empresaId: input.empresaId,
          tipo: "DEBITO",
          categoria: `OWNER_COMPENSATION_${input.tipo}`,
          valor: input.valor,
          descricao: input.descricao ?? COMPENSATION_LABEL[input.tipo],
          documento: input.referencia ?? null,
          dataTransacao: input.data,
          saldoAnterior,
          saldoPosterior,
          metadata: {
            ownerCompensationId: compensation.id,
            tipoCompensacao: input.tipo,
          },
        },
      })

      const debitAccount = input.tipo === "SALARY"
        ? "WAGES_PAYROLL_EXPENSE"
        : input.tipo === "DISTRIBUTION"
          ? "OWNER_DISTRIBUTION"
          : "OWNER_EQUITY_DRAW"

      await postLedgerTransaction(
        {
          empresaId: input.empresaId,
          data: input.data,
          descricao: input.descricao ?? COMPENSATION_LABEL[input.tipo],
          sourceType: "OWNER_COMPENSATION",
          sourceId: compensation.id,
          entries: [
            {
              accountCode: debitAccount,
              debit: new Decimal(input.valor),
              memo: COMPENSATION_LABEL[input.tipo],
            },
            {
              accountCode: "CASH",
              credit: new Decimal(input.valor),
              memo: "Saída de caixa para compensação do proprietário",
            },
          ],
        },
        tx
      )
    }

    await tx.auditLog.create({
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
          bankAccountId: input.bankAccountId ?? null,
          saldoAnterior: saldoAnterior?.toFixed(2) ?? null,
          saldoPosterior: saldoPosterior?.toFixed(2) ?? null,
        }),
      },
    })

    return { success: true as const, data: compensation }
  })

  if (!result.success) {
    return result
  }

  return { success: true as const, data: result.data, warnings }
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

export async function deleteCompensation(id: number, userId: number, empresaId: number) {
  const compensation = await prisma.ownerCompensation.findFirst({
    where: { id, empresaId },
  })

  if (!compensation) {
    return { success: false as const, error: { code: "NOT_FOUND", message: "Compensação não encontrada" } }
  }

  if (compensation.bankAccountId) {
    return {
      success: false as const,
      error: {
        code: "BANK_LINKED_DELETE_BLOCKED",
        message: "Compensação vinculada a conta bancária não pode ser excluída; registre um estorno controlado.",
      },
    }
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
