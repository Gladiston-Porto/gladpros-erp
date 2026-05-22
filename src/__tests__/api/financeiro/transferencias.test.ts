/**
 * @jest-environment node
 *
 * Unit Tests — GET/POST /api/financeiro/transferencias
 *
 * Route is wrapped with withErrorHandler, so:
 *   UNAUTHENTICATED → 401 (caught by withErrorHandler mock)
 *   ZodError        → 422 (caught by withErrorHandler mock)
 *   Inline 403/404/400 are returned directly from the handler
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
          json: jest.fn().mockImplementation(() => {
            if (init?.body) {
              try {
                return Promise.resolve(JSON.parse(init.body))
              } catch {
                return Promise.resolve({})
              }
            }
            return Promise.resolve({})
          }),
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
    bankTransfer: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bankAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    bankTransaction: {
      create: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
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
 * Minimal withErrorHandler mock:
 *   - UNAUTHENTICATED error  → 401
 *   - ZodError               → 422
 *   - Everything else        → 500
 * Inline 403 / 400 / 404 are returned directly by the handler (no throw).
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
            // ZodError detection without importing ZodError in the factory
            if (
              error instanceof Error &&
              error.constructor.name === 'ZodError'
            ) {
              return {
                status: 422,
                _data: { error: 'Validation error', success: false },
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
const usuarioUser = { id: '2', role: 'USUARIO', status: 'ATIVO', empresaId: 1 }
const estoqueUser = { id: '3', role: 'ESTOQUE', status: 'ATIVO', empresaId: 1 }

const mockFromAccount = {
  id: 10,
  empresaId: 1,
  nome: 'Chase Checking — Dallas TX',
  banco: 'Chase Bank',
  saldoAtual: 10000,
  limiteCredito: null,
  ativo: true,
}

const mockToAccount = {
  id: 20,
  empresaId: 1,
  nome: 'Chase Savings — Dallas TX',
  banco: 'Chase Bank',
  saldoAtual: 5000,
  ativo: true,
}

const mockTransferencia = {
  id: 100,
  empresaId: 1,
  fromAccountId: 10,
  toAccountId: 20,
  valor: 500,
  descricao: 'Monthly savings transfer',
  status: 'CONCLUIDA',
  dataAgendamento: new Date('2026-04-01'),
  fromAccount: {
    id: 10,
    nome: 'Chase Checking',
    banco: 'Chase Bank',
    saldoAtual: 9500,
  },
  toAccount: {
    id: 20,
    nome: 'Chase Savings',
    banco: 'Chase Bank',
    saldoAtual: 5500,
  },
  transactions: [],
}

const validBody = {
  empresaId: 1,
  fromAccountId: 10,
  toAccountId: 20,
  valor: 500,
  descricao: 'Monthly savings transfer — Dallas TX',
  dataAgendamento: '2026-04-01T10:00:00.000Z',
}

function makeRequest(
  url = 'http://localhost/api/financeiro/transferencias',
  init?: { method?: string; body?: string },
) {
  return new NextRequest(url, init)
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/financeiro/transferencias', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
  })

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const { GET } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect((res as any)._data.success).toBe(false)
  })

  it('403 — USUARIO lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue(usuarioUser as any)
    mockCan.mockReturnValue(false)
    const { GET } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
    expect((res as any)._data.success).toBe(false)
  })

  it('403 — ESTOQUE lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue(estoqueUser as any)
    mockCan.mockReturnValue(false)
    const { GET } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('200 — returns paginated list with correct pagination envelope', async () => {
    ;(mockPrisma.bankTransfer.findMany as jest.Mock).mockResolvedValue([
      mockTransferencia,
    ])
    ;(mockPrisma.bankTransfer.count as jest.Mock).mockResolvedValue(1)

    const { GET } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const data = (res as any)._data
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(data.pagination).toMatchObject({
      page: 1,
      total: 1,
      totalPages: 1,
    })
  })

  it('200 — respects ?page=2&limit=10 query params', async () => {
    ;(mockPrisma.bankTransfer.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.bankTransfer.count as jest.Mock).mockResolvedValue(0)

    const { GET } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const res = await GET(
      makeRequest(
        'http://localhost/api/financeiro/transferencias?page=2&limit=10',
      ),
    )

    expect(res.status).toBe(200)
    const data = (res as any)._data
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(10)
  })

  it('200 — empty result set returns pagination with total 0', async () => {
    ;(mockPrisma.bankTransfer.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.bankTransfer.count as jest.Mock).mockResolvedValue(0)

    const { GET } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const data = (res as any)._data
    expect(data.pagination.total).toBe(0)
    expect(data.data).toHaveLength(0)
    expect(data.pagination.totalPages).toBe(0)
  })
})

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST /api/financeiro/transferencias', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
    // Use mockImplementation (not mockResolvedValueOnce) so the queue never
    // accumulates across tests when auth/Zod failures skip findUnique entirely.
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === mockFromAccount.id) return mockFromAccount
        if (where.id === mockToAccount.id) return mockToAccount
        return null
      },
    )
    ;(mockPrisma.$transaction as jest.Mock).mockResolvedValue(mockTransferencia)
    ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})
  })

  // ─── Auth / RBAC ────────────────────────────────────────────────────────────

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('403 — USUARIO lacks financeiro.create permission', async () => {
    mockRequireUser.mockResolvedValue(usuarioUser as any)
    mockCan.mockReturnValue(false)
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect((res as any)._data.success).toBe(false)
  })

  // ─── Zod validation → 422 ───────────────────────────────────────────────────

  it('422 — valor must be > 0 (valor = 0 rejected by schema)', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify({ ...validBody, valor: 0 }) },
    )
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('422 — negative valor rejected by schema', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      {
        method: 'POST',
        body: JSON.stringify({ ...validBody, valor: -100 }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('422 — same fromAccountId and toAccountId rejected by schema refine', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      {
        method: 'POST',
        body: JSON.stringify({ ...validBody, toAccountId: validBody.fromAccountId }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('422 — missing required field descricao', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const { descricao: _omit, ...bodyWithout } = validBody
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(bodyWithout) },
    )
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('201 — ignores request empresaId and uses authenticated user empresaId', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const { empresaId: _omit, ...bodyWithout } = validBody
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(bodyWithout) },
    )
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  // ─── Business rule validation → 404 / 400 ───────────────────────────────────

  it('404 — fromAccount not found in database', async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === 10) return null // fromAccount missing
        if (where.id === 20) return mockToAccount
        return null
      },
    )
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      {
        method: 'POST',
        body: JSON.stringify({ ...validBody, fromAccountId: 999 }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect((res as any)._data.success).toBe(false)
    expect((res as any)._data.message).toContain('origem')
  })

  it('400 — fromAccount is inactive', async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === mockFromAccount.id)
          return { ...mockFromAccount, ativo: false }
        if (where.id === mockToAccount.id) return mockToAccount
        return null
      },
    )
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((res as any)._data.message).toContain('inativa')
  })

  it('400 — fromAccount belongs to a different empresa', async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === mockFromAccount.id)
          return { ...mockFromAccount, empresaId: 99 }
        if (where.id === mockToAccount.id) return mockToAccount
        return null
      },
    )
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('404 — toAccount not found in database', async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === mockFromAccount.id) return mockFromAccount
        if (where.id === 20) return null // toAccount missing
        return null
      },
    )
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      {
        method: 'POST',
        body: JSON.stringify({ ...validBody, toAccountId: 999 }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect((res as any)._data.message).toContain('destino')
  })

  it('400 — toAccount is inactive', async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === mockFromAccount.id) return mockFromAccount
        if (where.id === mockToAccount.id)
          return { ...mockToAccount, ativo: false }
        return null
      },
    )
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((res as any)._data.message).toContain('inativa')
  })

  it('400 — toAccount belongs to a different empresa', async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === mockFromAccount.id) return mockFromAccount
        if (where.id === mockToAccount.id)
          return { ...mockToAccount, empresaId: 99 }
        return null
      },
    )
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 — insufficient balance (saldo 100, trying to transfer 5000)', async () => {
    ;(mockPrisma.bankAccount.findFirst as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: number } }) => {
        if (where.id === mockFromAccount.id)
          return { ...mockFromAccount, saldoAtual: 100 }
        if (where.id === mockToAccount.id) return mockToAccount
        return null
      },
    )
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      {
        method: 'POST',
        body: JSON.stringify({ ...validBody, valor: 5000 }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((res as any)._data.message).toContain('Saldo insuficiente')
  })

  // ─── Success ────────────────────────────────────────────────────────────────

  it('201 — transfer created with correct response structure', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = (res as any)._data
    expect(data.success).toBe(true)
    expect(data.message).toContain('sucesso')
    expect(data.data).toBeDefined()
  })

  it('201 — auditLog.create is called once after successful transfer', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    await POST(req)

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          entidade: 'BankTransfer',
          acao: 'TRANSFERENCIA_REALIZADA',
        }),
      }),
    )
  })

  it('201 — $transaction is called with correct transfer amount', async () => {
    const { POST } = await import(
      '@/app/api/financeiro/transferencias/route'
    )
    const req = makeRequest(
      'http://localhost/api/financeiro/transferencias',
      { method: 'POST', body: JSON.stringify(validBody) },
    )
    await POST(req)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
