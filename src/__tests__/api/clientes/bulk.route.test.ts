/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock('@/shared/lib/rbac', () => ({
  requireClientePermission: jest.fn(),
}))

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  },
}))

jest.mock('@/shared/lib/helpers/cliente', () => ({
  getClientesBlockingDependenciesMap: jest.fn(),
  hasBlockingDependencies: jest.fn(),
  buildClienteDependencyConflictDetails: jest.fn(),
  calculateClienteDiff: jest.fn().mockReturnValue({ status: { old: 'ATIVO', new: 'INATIVO' } }),
}))

jest.mock('@/shared/lib/audit', () => ({
  AuditService: {
    logAction: jest.fn().mockResolvedValue(undefined),
  },
}))

import { POST } from '@/app/api/clientes/bulk/route'
import { prisma } from '@/lib/prisma'
import { requireClientePermission } from '@/shared/lib/rbac'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import {
  getClientesBlockingDependenciesMap,
  hasBlockingDependencies,
  buildClienteDependencyConflictDetails,
} from '@/shared/lib/helpers/cliente'

const mockPrisma = prisma as {
  cliente: { findMany: jest.Mock; updateMany: jest.Mock }
}

const mockRequirePermission = requireClientePermission as jest.Mock
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock
const mockGetDependencies = getClientesBlockingDependenciesMap as jest.Mock
const mockHasBlocking = hasBlockingDependencies as jest.Mock
const mockBuildDetails = buildClienteDependencyConflictDetails as jest.Mock

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/clientes/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/clientes/bulk - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockResolvedValue({ allowed: true })
    mockRequirePermission.mockResolvedValue({ id: '1', role: 'ADMIN' })
    mockPrisma.cliente.findMany.mockResolvedValue([
      { id: 10, tipo: 'PF', nomeCompleto: 'Alice', razaoSocial: null, nomeFantasia: null, email: 'a@a.com', telefone: null, endereco: null, status: 'INATIVO', docHash: null },
    ])
    mockPrisma.cliente.updateMany.mockResolvedValue({ count: 1 })
    mockGetDependencies.mockResolvedValue(new Map())
    mockHasBlocking.mockReturnValue(false)
    mockBuildDetails.mockReturnValue({ activeServiceOrders: 0, activeProjetos: 0, activeInvoices: 0 })
  })

  it('activates selected clients', async () => {
    const res = await POST(makeRequest({ action: 'activate', scope: 'selected', ids: [10] }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.processed).toBe(1)
    expect(mockPrisma.cliente.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ATIVO', ativo: true } })
    )
  })

  it('returns 400 when selected scope has no IDs', async () => {
    const res = await POST(makeRequest({ action: 'activate', scope: 'selected', ids: [] }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 409 when deactivate finds blocked clients', async () => {
    mockPrisma.cliente.findMany.mockResolvedValue([
      { id: 20, tipo: 'PF', nomeCompleto: 'Bob', razaoSocial: null, nomeFantasia: null, email: 'b@b.com', telefone: null, endereco: null, status: 'ATIVO', docHash: null },
    ])
    const depMap = new Map([[20, { activeServiceOrders: 1, activeProjetos: 0, activeInvoices: 0 }]])
    mockGetDependencies.mockResolvedValue(depMap)
    mockHasBlocking.mockReturnValue(true)
    mockBuildDetails.mockReturnValue({ activeServiceOrders: 1 })

    const res = await POST(makeRequest({ action: 'deactivate', scope: 'selected', ids: [20] }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.success).toBe(false)
    expect(json.details.totalBlocked).toBe(1)
  })

  it('returns 409 when delete finds blocked clients', async () => {
    mockPrisma.cliente.findMany.mockResolvedValue([
      { id: 30, tipo: 'PF', nomeCompleto: 'Charlie', razaoSocial: null, nomeFantasia: null, email: 'c@c.com', status: 'ATIVO' },
    ])
    const depMap = new Map([[30, { activeServiceOrders: 0, activeProjetos: 1, activeInvoices: 0 }]])
    mockGetDependencies.mockResolvedValue(depMap)
    mockHasBlocking.mockReturnValue(true)
    mockBuildDetails.mockReturnValue({ activeProjetos: 1 })

    const res = await POST(makeRequest({ action: 'delete', scope: 'selected', ids: [30] }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.success).toBe(false)
  })

  it('processes allFiltered scope with no IDs', async () => {
    const res = await POST(makeRequest({ action: 'activate', scope: 'allFiltered', filters: { tipo: 'PF' } }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 0 processed when no clients found', async () => {
    mockPrisma.cliente.findMany.mockResolvedValue([])
    const res = await POST(makeRequest({ action: 'activate', scope: 'selected', ids: [99] }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.processed).toBe(0)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, message: 'Muitas requisições' })
    const res = await POST(makeRequest({ action: 'activate', scope: 'selected', ids: [1] }))
    const json = await res.json()
    expect(res.status).toBe(429)
    expect(json.success).toBe(false)
  })

  it('returns 422 on invalid action', async () => {
    const res = await POST(makeRequest({ action: 'invalid', scope: 'selected', ids: [1] }))
    expect(res.status).toBe(422)
  })
})
