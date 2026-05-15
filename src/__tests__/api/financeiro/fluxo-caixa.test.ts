/**
 * @jest-environment node
 *
 * Unit Tests — GET /api/financeiro/fluxo-caixa
 *
 * Route is wrapped with withErrorHandler.
 * Only GET is exposed (no POST/PUT).
 *
 * Key guard behavior:
 *   UNAUTHENTICATED       → 401 (via withErrorHandler mock)
 *   Role without perm     → 403 (inline can() check)
 *   dataInicio > dataFim  → 400 (inline date validation)
 *   period > 365 days     → 400 (inline period validation)
 *   Success               → 200 with rich KPI/projection payload
 */

jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try {
      return new URLSearchParams(
        url.includes('?') ? (url.split('?')[1] ?? '') : '',
      )
    } catch {
      return new URLSearchParams()
    }
  }
  return {
    NextRequest: jest
      .fn()
      .mockImplementation(
        (url: string, init?: { method?: string; body?: string }) => ({
          url,
          method: (init?.method ?? 'GET').toUpperCase(),
          nextUrl: { searchParams: makeSearchParams(url) },
          headers: { get: () => null },
          json: jest.fn().mockResolvedValue({}),
        }),
      ),
    NextResponse: {
      json: jest
        .fn()
        .mockImplementation(
          (data: unknown, options?: { status?: number }) => ({
            status: options?.status ?? 200,
            _data: data,
          }),
        ),
    },
  }
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    bankAccount: { findMany: jest.fn() },
    revenue: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    revenueRecurrence: { findMany: jest.fn() },
    expenseRecurrence: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/api/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}))

/**
 * Minimal withErrorHandler mock — mirrors the real behavior for the cases
 * we care about in these tests.
 */
jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest
    .fn()
    .mockImplementation(
      (handler: (...a: unknown[]) => Promise<unknown>) =>
        async (...args: unknown[]) => {
          try {
            return await handler(...args)
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === 'UNAUTHENTICATED'
            ) {
              return {
                status: 401,
                _data: { error: 'Unauthorized', success: false },
              }
            }
            return {
              status: 500,
              _data: { error: 'Internal server error', success: false },
            }
          }
        },
    ),
}))

import { NextRequest } from 'next/server'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import { prisma } from '@/lib/prisma'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const adminUser = { id: '1', role: 'ADMIN', status: 'ATIVO', empresaId: 1 }
const financeiroUser = {
  id: '2',
  role: 'FINANCEIRO',
  status: 'ATIVO',
  empresaId: 1,
}
const usuarioUser = { id: '3', role: 'USUARIO', status: 'ATIVO', empresaId: 1 }
const estoqueUser = { id: '4', role: 'ESTOQUE', status: 'ATIVO', empresaId: 1 }

// Use fixed dates safely in the past so they don't conflict with test date ranges
const fixedPastDate = new Date('2025-06-15T12:00:00.000Z')

const mockContasAtivas = [
  {
    id: 1,
    nome: 'Chase Checking — Dallas TX',
    banco: 'Chase Bank',
    saldoAtual: 15000,
    limiteCredito: null,
  },
  {
    id: 2,
    nome: 'Chase Savings — Dallas TX',
    banco: 'Chase Bank',
    saldoAtual: 8000,
    limiteCredito: null,
  },
]

const mockReceitas = [
  {
    id: 1,
    descricao: 'Landscaping service — Plano TX',
    valor: 3500,
    dataVencimento: fixedPastDate,
    dataPagamento: fixedPastDate,
    status: 'RECEBIDA',
    categoria: { nome: 'Services' },
  },
]

const mockDespesas = [
  {
    id: 1,
    descricao: 'Equipment rental — Dallas TX',
    valor: 800,
    dataVencimento: fixedPastDate,
    dataPagamento: fixedPastDate,
    status: 'PAGA',
    categoria: { nome: 'Equipment' },
  },
]

function makeRequest(
  url = 'http://localhost/api/financeiro/fluxo-caixa',
  init?: { method?: string; body?: string },
) {
  return new NextRequest(url, init)
}

/** Set up all Prisma mocks with default happy-path data */
function setupDefaultMocks() {
  ;(mockPrisma.bankAccount.findMany as jest.Mock).mockResolvedValue(
    mockContasAtivas,
  )
  ;(mockPrisma.revenue.findMany as jest.Mock).mockResolvedValue(mockReceitas)
  ;(mockPrisma.expense.findMany as jest.Mock).mockResolvedValue(mockDespesas)
  ;(mockPrisma.revenueRecurrence.findMany as jest.Mock).mockResolvedValue([])
  ;(mockPrisma.expenseRecurrence.findMany as jest.Mock).mockResolvedValue([])
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/financeiro/fluxo-caixa', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
  })

  // ─── Auth / RBAC ────────────────────────────────────────────────────────────

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect((res as any)._data.success).toBe(false)
  })

  it('403 — USUARIO lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue(usuarioUser as any)
    mockCan.mockReturnValue(false)
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
    expect((res as any)._data.success).toBe(false)
  })

  it('403 — ESTOQUE lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue(estoqueUser as any)
    mockCan.mockReturnValue(false)
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  // ─── Date validation → 400 ──────────────────────────────────────────────────

  it('400 — dataInicio cannot be after dataFim', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-31&dataFim=2026-01-01'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(400)
    const data = (res as any)._data
    expect(data.success).toBe(false)
    expect(data.message).toContain(
      'Data inicial não pode ser maior que data final',
    )
  })

  it('400 — period exceeds 365-day maximum', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    // 2024-01-01 → 2025-12-31 = 730 days
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2024-01-01&dataFim=2025-12-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(400)
    const data = (res as any)._data
    expect(data.success).toBe(false)
    expect(data.message).toContain('365 dias')
  })

  it('400 — period of exactly 366 days is rejected', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2025-01-01&dataFim=2026-01-02'
    const res = await GET(makeRequest(url))
    expect(res.status).toBe(400)
  })

  // ─── Success — 200 ──────────────────────────────────────────────────────────

  it('200 — ADMIN gets cash flow for default period (last 30 days)', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const data = (res as any)._data
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.kpis).toBeDefined()
    expect(data.data.evolucaoDiaria).toBeDefined()
    expect(data.data.categorias).toBeDefined()
    expect(data.data.alertas).toBeDefined()
    expect(data.data.metadados).toBeDefined()
  })

  it('200 — FINANCEIRO gets cash flow for custom period (Jan 2026)', async () => {
    setupDefaultMocks()
    mockRequireUser.mockResolvedValue(financeiroUser as any)
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const data = (res as any)._data
    expect(data.data.periodo.dataInicio).toBe('2026-01-01')
    expect(data.data.periodo.dataFim).toBe('2026-01-31')
    expect(data.data.periodo.dias).toBe(30)
  })

  it('200 — KPIs reflect mocked account balances and transactions', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const { kpis } = (res as any)._data.data

    // saldoAtual = 15000 + 8000 = 23000
    expect(kpis.saldoAtual).toBe(23000)
    // saldoDisponivel = saldoAtual + limiteTotal (0) = 23000
    expect(kpis.saldoDisponivel).toBe(23000)
    // totalReceitasPeriodo = 3500 (from mockReceitas)
    expect(kpis.receitasPeriodo.total).toBe(3500)
    // totalReceitasPagas = 3500 (status=RECEBIDA)
    expect(kpis.receitasPeriodo.pagas).toBe(3500)
    // totalDespesasPeriodo = 800 (from mockDespesas)
    expect(kpis.despesasPeriodo.total).toBe(800)
    // totalDespesasPagas = 800 (status=PAGA)
    expect(kpis.despesasPeriodo.pagas).toBe(800)
    // resultadoPeriodo = 3500 - 800 = 2700
    expect(kpis.resultadoPeriodo).toBe(2700)
    // resultadoRealizado = 3500 - 800 = 2700
    expect(kpis.resultadoRealizado).toBe(2700)
  })

  it('200 — projection included by default (revenueRecurrence queried)', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    expect((res as any)._data.data.projecoes).not.toBeNull()
    expect(mockPrisma.revenueRecurrence.findMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.expenseRecurrence.findMany).toHaveBeenCalledTimes(1)
  })

  it('200 — projection excluded when ?incluirProjecao=false', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31&incluirProjecao=false'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    expect((res as any)._data.data.projecoes).toBeNull()
    // Recurrence tables should NOT be queried when projection is disabled
    expect(mockPrisma.revenueRecurrence.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.expenseRecurrence.findMany).not.toHaveBeenCalled()
  })

  it('200 — projection periodo covers correct number of days (diasProjecao=30 default)', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    const { projecoes } = (res as any)._data.data
    expect(projecoes.periodoProjecao.dias).toBe(30)
    // The projection loop runs d <= dataProjecaoFim (inclusive both ends),
    // so for diasProjecao=30 the array has 31 entries (days 1..30+1).
    expect(projecoes.evolucaoProjetada).toHaveLength(31)
  })

  it('200 — custom diasProjecao=7 shrinks projection array', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31&diasProjecao=7'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const { projecoes } = (res as any)._data.data
    expect(projecoes.periodoProjecao.dias).toBe(7)
    // Same inclusive loop: 7+1 = 8 entries
    expect(projecoes.evolucaoProjetada).toHaveLength(8)
  })

  it('200 — negative total balance triggers SALDO_NEGATIVO CRITICO alert', async () => {
    ;(mockPrisma.bankAccount.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        nome: 'Chase Checking',
        banco: 'Chase Bank',
        saldoAtual: -500,
        limiteCredito: null,
      },
    ])
    ;(mockPrisma.revenue.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.expense.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.revenueRecurrence.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.expenseRecurrence.findMany as jest.Mock).mockResolvedValue([])

    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const { alertas } = (res as any)._data.data
    const saldoAlert = alertas.find(
      (a: { categoria: string }) => a.categoria === 'SALDO_NEGATIVO',
    )
    expect(saldoAlert).toBeDefined()
    expect(saldoAlert.tipo).toBe('CRITICO')
    expect(saldoAlert.valor).toBe(-500)
  })

  it('200 — CONTAS_NEGATIVAS alert emitted when individual account is negative', async () => {
    ;(mockPrisma.bankAccount.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        nome: 'Chase Checking',
        banco: 'Chase Bank',
        saldoAtual: -200,
        limiteCredito: 500, // saldoAtual total is -200 + 500 = 300 (positive), but account itself is negative
      },
    ])
    ;(mockPrisma.revenue.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.expense.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.revenueRecurrence.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.expenseRecurrence.findMany as jest.Mock).mockResolvedValue([])

    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const { alertas } = (res as any)._data.data
    const contasAlert = alertas.find(
      (a: { categoria: string }) => a.categoria === 'CONTAS_NEGATIVAS',
    )
    expect(contasAlert).toBeDefined()
    expect(contasAlert.tipo).toBe('ATENCAO')
  })

  it('200 — metadados reports correct record counts', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const { metadados } = (res as any)._data.data
    expect(metadados.contas).toBe(2) // mockContasAtivas has 2 accounts
    expect(metadados.receitas).toBe(1) // mockReceitas has 1 item
    expect(metadados.despesas).toBe(1) // mockDespesas has 1 item
    expect(metadados.truncated).toBe(false)
    expect(metadados.geradoEm).toBeDefined()
  })

  it('200 — top categories grouped correctly from mocked receipts/expenses', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const { categorias } = (res as any)._data.data
    expect(categorias.receitas).toHaveLength(1)
    expect(categorias.receitas[0]).toMatchObject({
      categoria: 'Services',
      total: 3500,
    })
    expect(categorias.despesas).toHaveLength(1)
    expect(categorias.despesas[0]).toMatchObject({
      categoria: 'Equipment',
      total: 800,
    })
  })

  it('200 — no alertas for healthy books (positive balance, no overdue items)', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    // All receipts/expenses in mocks are already RECEBIDA/PAGA → no PENDENTE overdue
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    const res = await GET(makeRequest(url))

    expect(res.status).toBe(200)
    const { alertas } = (res as any)._data.data
    // No SALDO_NEGATIVO, DESPESAS_VENCIDAS, or RECEITAS_ATRASADAS
    const criticalCategories = ['SALDO_NEGATIVO', 'DESPESAS_VENCIDAS', 'RECEITAS_ATRASADAS']
    criticalCategories.forEach(cat => {
      expect(
        alertas.find((a: { categoria: string }) => a.categoria === cat),
      ).toBeUndefined()
    })
  })

  it('200 — bankAccount.findMany queried with correct empresaId (single-tenant guard)', async () => {
    setupDefaultMocks()
    const { GET } = await import('@/app/api/financeiro/fluxo-caixa/route')
    const url =
      'http://localhost/api/financeiro/fluxo-caixa?dataInicio=2026-01-01&dataFim=2026-01-31'
    await GET(makeRequest(url))

    expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 1, ativo: true }),
      }),
    )
  })
})
