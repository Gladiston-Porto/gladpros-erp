/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    expense: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: 1, valor: 100, status: 'PAGA' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
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

import { POST } from '@/app/api/financeiro/despesas/[id]/pagar/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

describe('POST /api/financeiro/despesas/[id]/pagar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws UNAUTHENTICATED when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/despesas/1/pagar', {
      method: 'POST',
      body: JSON.stringify({ dataPagamento: new Date().toISOString() }),
    })
    const ctx = { params: Promise.resolve({ id: '1' }) }
    await expect(POST(req, ctx)).rejects.toThrow('UNAUTHENTICATED')
  })

  it('returns 403 when user lacks financeiro.update permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/despesas/1/pagar', {
      method: 'POST',
      body: JSON.stringify({ dataPagamento: new Date().toISOString() }),
    })
    const ctx = { params: Promise.resolve({ id: '1' }) }
    const res = await POST(req, ctx)
    expect(res.status).toBe(403)
  })

  it('returns 404 when expense not found', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(true)
    const { prisma } = require('@/lib/prisma')
    prisma.expense.findUnique.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/financeiro/despesas/1/pagar', {
      method: 'POST',
      body: JSON.stringify({ dataPagamento: new Date().toISOString(), expenseId: 1 }),
    })
    const ctx = { params: Promise.resolve({ id: '1' }) }
    const res = await POST(req, ctx)
    expect(res.status).toBe(404)
  })
})
