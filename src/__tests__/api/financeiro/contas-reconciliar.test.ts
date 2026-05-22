/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    bankAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    bankTransaction: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
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

import { POST } from '@/app/api/financeiro/contas/[id]/reconciliar/route'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

describe('POST /api/financeiro/contas/[id]/reconciliar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', empresaId: 7 } as any)
    mockCan.mockReturnValue(true)
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma))
    mockPrisma.bankAccount.findFirst.mockResolvedValue({ id: 10, nome: 'Operating', ativo: true })
    mockPrisma.bankTransaction.findMany.mockResolvedValue([
      { id: 100, descricao: 'Invoice payment', valor: 250, reconciliada: false },
      { id: 101, descricao: 'Expense payment', valor: 50, reconciliada: true },
    ])
    mockPrisma.bankTransaction.updateMany.mockResolvedValue({ count: 1 } as any)
    mockPrisma.bankAccount.update.mockResolvedValue({})
    mockPrisma.auditLog.create.mockResolvedValue({})
  })

  it('scopes transactions by authenticated empresaId and records audit log', async () => {
    const req = new NextRequest('http://localhost/api/financeiro/contas/10/reconciliar', {
      method: 'POST',
      body: JSON.stringify({
        transactionIds: [100, 101],
        dataReconciliacao: '2026-05-18T12:00:00.000Z',
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) })

    expect(res.status).toBe(200)
    expect(mockPrisma.bankTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: [100, 101] },
        accountId: 10,
        empresaId: 7,
      },
    }))
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 1,
        entidade: 'BankReconciliation',
        entidadeId: '10',
        acao: 'RECONCILE',
        diff: expect.stringContaining('"transactionIds":[100]'),
      }),
    }))
  })

  it('returns 404 when account does not belong to authenticated empresa', async () => {
    mockPrisma.bankAccount.findFirst.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/financeiro/contas/10/reconciliar', {
      method: 'POST',
      body: JSON.stringify({ transactionIds: [100] }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) })

    expect(res.status).toBe(404)
    expect(mockPrisma.bankTransaction.findMany).not.toHaveBeenCalled()
  })
})
