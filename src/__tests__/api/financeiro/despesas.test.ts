/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    expense: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 1, valor: 100 }),
      update: jest.fn().mockResolvedValue({ id: 1, valor: 100 }),
      findUnique: jest.fn().mockResolvedValue(null),
      aggregate: jest.fn().mockResolvedValue({ _sum: { valor: 0 }, _avg: { valor: 0 }, _count: 0 }),
    },
    expenseCategory: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation(async (fn: Function) => fn({
      expense: { create: jest.fn().mockResolvedValue({ id: 1 }), update: jest.fn() },
      expenseApproval: { create: jest.fn().mockResolvedValue({ id: 1 }), update: jest.fn() },
    })),
  }
}))

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}))

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}))

jest.mock('@/lib/api/responses', () => ({
  validationErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ success: false }), { status: 400 })
  ),
}))

import { GET, POST } from '@/app/api/financeiro/despesas/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

describe('GET /api/financeiro/despesas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws UNAUTHENTICATED when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/despesas?empresaId=1')
    await expect(GET(req)).rejects.toThrow('UNAUTHENTICATED')
  })

  it('returns 403 when user lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/despesas?empresaId=1')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 with data for authorized user', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/financeiro/despesas?empresaId=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe('POST /api/financeiro/despesas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws UNAUTHENTICATED when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/despesas', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await expect(POST(req)).rejects.toThrow('UNAUTHENTICATED')
  })

  it('returns 403 when user lacks financeiro.create permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/despesas', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 500 when Prisma throws DB error on GET', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'ADMIN', status: 'ATIVO', empresaId: 1 } as any)
    mockCan.mockReturnValue(true)
    const { prisma } = require('@/lib/prisma')
    prisma.expense.findMany.mockRejectedValue(new Error('DB connection failed'))
    const req = new NextRequest('http://localhost/api/financeiro/despesas?empresaId=1')
    await expect(GET(req)).rejects.toThrow('DB connection failed')
  })
})
