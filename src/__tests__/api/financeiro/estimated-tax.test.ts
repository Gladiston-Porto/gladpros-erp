/**
 * @jest-environment node
 *
 * Unit Tests — GET/POST /api/financeiro/estimated-tax
 *
 * Route has its own try/catch (no withErrorHandler), so:
 *   UNAUTHENTICATED  → 401 (caught in route)
 *   Forbidden        → 403 (inline can() check)
 *   Zod safeParse    → 400 (inline safeParse check)
 *   Service failure  → 422 | 500
 */

import { NextRequest } from 'next/server'

// Prisma is not used directly in this route — stub to satisfy transitive imports
jest.mock('@/lib/prisma', () => ({}))

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}))

jest.mock('@/shared/services/estimatedTaxService', () => ({
  getQuarterlyEstimates: jest.fn(),
  recordPayment: jest.fn(),
}))

jest.mock('@/lib/api/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

import { GET, POST } from '@/app/api/financeiro/estimated-tax/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import {
  getQuarterlyEstimates,
  recordPayment,
} from '@/shared/services/estimatedTaxService'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>
const mockGetQuarterlyEstimates = getQuarterlyEstimates as jest.MockedFunction<
  typeof getQuarterlyEstimates
>
const mockRecordPayment = recordPayment as jest.MockedFunction<
  typeof recordPayment
>

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

const mockEstimates = [
  {
    id: 1,
    quarter: 'Q1',
    dueDate: new Date('2026-04-15'),
    estimatedAmount: 2500,
    paidAmount: 0,
    status: 'PENDING',
    daysUntilDue: 30,
    alertLevel: 'info',
  },
  {
    id: null,
    quarter: 'Q2',
    dueDate: new Date('2026-06-15'),
    estimatedAmount: 2500,
    paidAmount: 0,
    status: 'UPCOMING',
    daysUntilDue: 90,
    alertLevel: 'none',
  },
]

const validPostBody = {
  taxYear: 2026,
  quarter: 'Q1',
  paidAmount: 2500,
  paidDate: '2026-04-15T00:00:00.000Z',
  notas: 'Q1 2026 quarterly estimated tax — Dallas TX',
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/financeiro/estimated-tax', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('401 — unauthenticated request', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('403 — USUARIO lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue(usuarioUser as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax')
    const res = await GET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('403 — ESTOQUE lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue(estoqueUser as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('200 — ADMIN gets estimates for current year (default)', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
    mockGetQuarterlyEstimates.mockResolvedValue(mockEstimates as any)

    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(mockGetQuarterlyEstimates).toHaveBeenCalledWith(
      1,
      new Date().getFullYear(),
    )
  })

  it('200 — FINANCEIRO gets estimates for a specific year via ?year=', async () => {
    mockRequireUser.mockResolvedValue(financeiroUser as any)
    mockCan.mockReturnValue(true)
    mockGetQuarterlyEstimates.mockResolvedValue(mockEstimates as any)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax?year=2025',
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockGetQuarterlyEstimates).toHaveBeenCalledWith(1, 2025)
  })

  it('200 — response contains correct quarter structure', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
    mockGetQuarterlyEstimates.mockResolvedValue(mockEstimates as any)

    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax')
    const res = await GET(req)
    const body = await res.json()

    expect(body.data[0]).toMatchObject({
      quarter: 'Q1',
      estimatedAmount: 2500,
      paidAmount: 0,
    })
  })

  it('500 — service throws DB error', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
    mockGetQuarterlyEstimates.mockRejectedValue(
      new Error('DB connection failed'),
    )

    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST /api/financeiro/estimated-tax', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── Auth / RBAC ────────────────────────────────────────────────────────────

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(validPostBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('403 — USUARIO lacks financeiro.create permission', async () => {
    mockRequireUser.mockResolvedValue(usuarioUser as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(validPostBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('403 — ESTOQUE lacks financeiro.create permission', async () => {
    mockRequireUser.mockResolvedValue(estoqueUser as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(validPostBody) },
    )
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  // ─── Zod safeParse — 400 ────────────────────────────────────────────────────

  it('400 — missing taxYear', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)

    const { taxYear: _omit, ...bodyWithout } = validPostBody
    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(bodyWithout) },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('400 — invalid quarter value (Q5 not in enum)', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      {
        method: 'POST',
        body: JSON.stringify({ ...validPostBody, quarter: 'Q5' }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('400 — taxYear below minimum (2019 < 2020)', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      {
        method: 'POST',
        body: JSON.stringify({ ...validPostBody, taxYear: 2019 }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 — taxYear above maximum (2101 > 2100)', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      {
        method: 'POST',
        body: JSON.stringify({ ...validPostBody, taxYear: 2101 }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 — paidAmount is negative (nonnegative validation)', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      {
        method: 'POST',
        body: JSON.stringify({ ...validPostBody, paidAmount: -1 }),
      },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 — missing paidAmount', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)

    const { paidAmount: _omit, ...bodyWithout } = validPostBody
    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(bodyWithout) },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ─── Success ────────────────────────────────────────────────────────────────

  it('201 — ADMIN records Q1 payment successfully', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
    mockRecordPayment.mockResolvedValue({
      success: true,
      data: { id: 10, ...validPostBody },
    } as any)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(validPostBody) },
    )
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
  })

  it('201 — FINANCEIRO records payment with paidAmount = 0 (free quarter)', async () => {
    mockRequireUser.mockResolvedValue(financeiroUser as any)
    mockCan.mockReturnValue(true)
    mockRecordPayment.mockResolvedValue({
      success: true,
      data: { id: 11, taxYear: 2026, quarter: 'Q2', paidAmount: 0 },
    } as any)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      {
        method: 'POST',
        body: JSON.stringify({ ...validPostBody, quarter: 'Q2', paidAmount: 0 }),
      },
    )
    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(mockRecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: 1,
        taxYear: 2026,
        quarter: 'Q2',
        paidAmount: 0,
        userId: 2,
      }),
    )
  })

  // ─── Business rule failure ───────────────────────────────────────────────────

  it('422 — recordPayment returns failure (already recorded for quarter)', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
    mockRecordPayment.mockResolvedValue({
      success: false,
      error: 'Payment already recorded for Q1 2026',
    } as any)

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(validPostBody) },
    )
    const res = await POST(req)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  // ─── Unexpected error ────────────────────────────────────────────────────────

  it('500 — service throws unexpected DB error', async () => {
    mockRequireUser.mockResolvedValue(adminUser as any)
    mockCan.mockReturnValue(true)
    mockRecordPayment.mockRejectedValue(new Error('Database connection lost'))

    const req = new NextRequest(
      'http://localhost/api/financeiro/estimated-tax',
      { method: 'POST', body: JSON.stringify(validPostBody) },
    )
    const res = await POST(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
