/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}))

jest.mock('@/shared/services/estimatedTaxService', () => ({
  updatePayment: jest.fn(),
}))

jest.mock('@/lib/api/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

import { PUT } from '@/app/api/financeiro/estimated-tax/[id]/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'
import { updatePayment } from '@/shared/services/estimatedTaxService'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>
const mockUpdatePayment = updatePayment as jest.MockedFunction<typeof updatePayment>

describe('PUT /api/financeiro/estimated-tax/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes authenticated empresaId to metadata-only updatePayment', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', empresaId: 7 } as any)
    mockCan.mockReturnValue(true)
    mockUpdatePayment.mockResolvedValue({
      success: true,
      data: { id: 10, paidAmount: 1200, notas: 'updated', status: 'PARTIAL' },
    } as any)

    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax/10', {
      method: 'PUT',
      body: JSON.stringify({ notas: 'updated' }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: '10' }) })
    expect(res.status).toBe(200)
    expect(mockUpdatePayment).toHaveBeenCalledWith(10, { notas: 'updated' }, 1, 7)
  })

  it('rejects paidAmount updates because financial deltas require bank/ledger flow', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', empresaId: 7 } as any)
    mockCan.mockReturnValue(true)

    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax/10', {
      method: 'PUT',
      body: JSON.stringify({ paidAmount: 1200 }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: '10' }) })
    expect(res.status).toBe(400)
    expect(mockUpdatePayment).not.toHaveBeenCalled()
  })

  it('returns 403 when role lacks financeiro.update permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '3', role: 'USUARIO', empresaId: 1 } as any)
    mockCan.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/financeiro/estimated-tax/10', {
      method: 'PUT',
      body: JSON.stringify({ paidAmount: 1200 }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: '10' }) })
    expect(res.status).toBe(403)
  })
})
