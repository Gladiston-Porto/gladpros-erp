/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({}))

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}))

jest.mock('@/shared/services/ownerCompensationService', () => ({
  createCompensation: jest.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
  listCompensations: jest.fn().mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  }),
}))

import { GET, POST } from '@/app/api/financeiro/owner-compensation/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

describe('GET /api/financeiro/owner-compensation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 with data for ADMIN', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'ADMIN', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe('POST /api/financeiro/owner-compensation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation', {
      method: 'POST',
      body: JSON.stringify({ workerId: 1, tipo: 'OWNER_DRAW', valor: 100, bankAccountId: 5, data: new Date().toISOString() }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks financeiro.create permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation', {
      method: 'POST',
      body: JSON.stringify({ workerId: 1, tipo: 'OWNER_DRAW', valor: 100, bankAccountId: 5, data: new Date().toISOString() }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 when FINANCEIRO tries to create owner compensation', async () => {
    mockRequireUser.mockResolvedValue({ id: '2', role: 'FINANCEIRO', status: 'ATIVO', empresaId: 1 } as any)
    mockCan.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation', {
      method: 'POST',
      body: JSON.stringify({ workerId: 1, tipo: 'OWNER_DRAW', valor: 100, bankAccountId: 5, data: new Date().toISOString() }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.message).toContain('Apenas ADMIN')
  })

  it('returns 201 when ADMIN creates owner compensation', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'ADMIN', status: 'ATIVO', empresaId: 1 } as any)
    mockCan.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation', {
      method: 'POST',
      body: JSON.stringify({ workerId: 1, tipo: 'OWNER_DRAW', valor: 100, bankAccountId: 5, data: new Date().toISOString() }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 500 when service throws DB error on GET', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'ADMIN', status: 'ATIVO', empresaId: 1 } as any)
    mockCan.mockReturnValue(true)
    const { listCompensations } = require('@/shared/services/ownerCompensationService')
    listCompensations.mockRejectedValue(new Error('DB connection failed'))
    const req = new NextRequest('http://localhost/api/financeiro/owner-compensation')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})
