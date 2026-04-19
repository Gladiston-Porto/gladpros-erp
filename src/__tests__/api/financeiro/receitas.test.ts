/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    revenue: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { valor: 0 }, _count: 0 }),
    },
    empresa: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    revenueCategory: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    cliente: { findUnique: jest.fn().mockResolvedValue(null) },
    revenueRecurrence: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    $transaction: jest.fn().mockImplementation(async (fn: Function) => fn({
      revenue: { create: jest.fn().mockResolvedValue({ id: 1, recorrenciaId: null }), update: jest.fn() },
      revenueRecurrence: { create: jest.fn().mockResolvedValue({ id: 1 }) },
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

import { GET, POST } from '@/app/api/financeiro/receitas/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

describe('GET /api/financeiro/receitas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws UNAUTHENTICATED when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/receitas?empresaId=1')
    await expect(GET(req)).rejects.toThrow('UNAUTHENTICATED')
  })

  it('returns 403 when user lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/receitas?empresaId=1')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 with data for authorized user', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/financeiro/receitas?empresaId=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe('POST /api/financeiro/receitas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws UNAUTHENTICATED when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/receitas', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await expect(POST(req)).rejects.toThrow('UNAUTHENTICATED')
  })

  it('returns 403 when user lacks financeiro.create permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/receitas', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
