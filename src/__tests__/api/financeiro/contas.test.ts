/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    bankAccount: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { saldoAtual: 0, saldoInicial: 0, limiteCredito: 0 }, _count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 1, nome: 'Test', empresaId: 1 }),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    empresa: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    bankTransaction: { create: jest.fn().mockResolvedValue({ id: 1 }) },
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

import { GET, POST } from '@/app/api/financeiro/contas/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

describe('GET /api/financeiro/contas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws UNAUTHENTICATED when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/contas')
    await expect(GET(req)).rejects.toThrow('UNAUTHENTICATED')
  })

  it('returns 403 when user lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/contas')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 with data for authorized user', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/financeiro/contas')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe('POST /api/financeiro/contas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws UNAUTHENTICATED when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/contas', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await expect(POST(req)).rejects.toThrow('UNAUTHENTICATED')
  })

  it('returns 403 when user lacks financeiro.create permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/contas', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
