/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
    prisma: {
      $transaction: jest.fn(),
      expense: {
      findFirst: jest.fn().mockResolvedValue(null),
      findFirstOrThrow: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 1, valor: 100, status: 'PAGA' }),
      updateMany: jest.fn(),
    },
    bankAccount: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    bankTransaction: { create: jest.fn() },
    ledgerTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
    const { prisma } = require('@/lib/prisma')
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma))
    prisma.bankAccount.findFirst.mockResolvedValue({ id: 9, saldoAtual: 1000 })
    prisma.bankAccount.findUniqueOrThrow.mockResolvedValue({ saldoAtual: 900 })
    prisma.bankAccount.update.mockResolvedValue({})
    prisma.bankAccount.updateMany.mockResolvedValue({ count: 1 })
    prisma.bankTransaction.create.mockResolvedValue({})
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null)
    prisma.ledgerTransaction.create.mockResolvedValue({ id: 88, entries: [] })
    prisma.auditLog.create.mockResolvedValue({})
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
    prisma.expense.findFirst.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/financeiro/despesas/1/pagar', {
      method: 'POST',
      body: JSON.stringify({ dataPagamento: new Date().toISOString(), expenseId: 1, bankAccountId: 9 }),
    })
    const ctx = { params: Promise.resolve({ id: '1' }) }
    const res = await POST(req, ctx)
    expect(res.status).toBe(404)
  })

  it('returns 200 (happy path) when expense exists and payment succeeds', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO', empresaId: 1 } as any)
    mockCan.mockReturnValue(true)
    const { prisma } = require('@/lib/prisma')
    prisma.expense.findFirst.mockResolvedValue({
      id: 1,
      valor: 100,
      status: 'APROVADA',
      descricao: 'Material elétrico',
      dataEmissao: new Date('2026-01-01T00:00:00.000Z'),
      requerAprovacao: false,
      formaPagamento: 'TRANSFERENCIA',
      observacoes: null,
    })
    prisma.expense.updateMany.mockResolvedValue({ count: 1 })
    prisma.expense.findFirstOrThrow.mockResolvedValue({ id: 1, valor: 100, status: 'PAGA' })
    const req = new NextRequest('http://localhost/api/financeiro/despesas/1/pagar', {
      method: 'POST',
      body: JSON.stringify({ dataPagamento: new Date().toISOString(), bankAccountId: 9 }),
    })
    const ctx = { params: Promise.resolve({ id: '1' }) }
    const res = await POST(req, ctx)
    expect([200, 201]).toContain(res.status)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(prisma.bankTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountId: 9,
        empresaId: 1,
        tipo: 'DEBITO',
        categoria: 'EXPENSE_PAYMENT',
        expenseId: 1,
      }),
    }))
    expect(prisma.bankAccount.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 9, empresaId: 1 }),
      data: expect.objectContaining({ saldoAtual: expect.objectContaining({ decrement: expect.anything() }) }),
    }))
    expect(prisma.ledgerTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceType: 'EXPENSE_PAYMENT',
        sourceId: 1,
      }),
    }))
  })

  it('returns 409 when bank account balance is insufficient', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO', empresaId: 1 } as any)
    mockCan.mockReturnValue(true)
    const { prisma } = require('@/lib/prisma')
    prisma.expense.findFirst.mockResolvedValue({
      id: 1,
      valor: 100,
      status: 'APROVADA',
      descricao: 'Material elétrico',
      dataEmissao: new Date('2026-01-01T00:00:00.000Z'),
      requerAprovacao: false,
      formaPagamento: 'TRANSFERENCIA',
      observacoes: null,
    })
    prisma.bankAccount.findFirst.mockResolvedValue({ id: 9, saldoAtual: 10 })
    const req = new NextRequest('http://localhost/api/financeiro/despesas/1/pagar', {
      method: 'POST',
      body: JSON.stringify({ dataPagamento: new Date().toISOString(), bankAccountId: 9 }),
    })
    const ctx = { params: Promise.resolve({ id: '1' }) }
    const res = await POST(req, ctx)
    expect(res.status).toBe(409)
    expect(prisma.expense.update).not.toHaveBeenCalled()
    expect(prisma.bankTransaction.create).not.toHaveBeenCalled()
  })

  it('returns 500 when Prisma throws DB error', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'ADMIN', status: 'ATIVO', empresaId: 1 } as any)
    mockCan.mockReturnValue(true)
    const { prisma } = require('@/lib/prisma')
    prisma.expense.findFirst.mockRejectedValue(new Error('DB connection failed'))
    const req = new NextRequest('http://localhost/api/financeiro/despesas/1/pagar', {
      method: 'POST',
      body: JSON.stringify({ dataPagamento: new Date().toISOString(), bankAccountId: 9 }),
    })
    const ctx = { params: Promise.resolve({ id: '1' }) }
    await expect(POST(req, ctx)).rejects.toThrow('DB connection failed')
  })
})
