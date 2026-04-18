/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/shared/lib/rbac', () => ({
  requireClientePermission: jest.fn(),
}))

jest.mock('@/shared/lib/helpers/cliente', () => ({
  getClientesBlockingDependenciesMap: jest.fn(),
  hasBlockingDependencies: jest.fn(),
  buildClienteDependencyConflictDetails: jest.fn(),
  logClienteAudit: jest.fn().mockResolvedValue(undefined),
}))

import { PUT } from '@/app/api/clientes/[id]/toggle-status/route'
import { prisma } from '@/lib/prisma'
import { requireClientePermission } from '@/shared/lib/rbac'
import {
  getClientesBlockingDependenciesMap,
  hasBlockingDependencies,
  buildClienteDependencyConflictDetails,
} from '@/shared/lib/helpers/cliente'

const mockPrisma = prisma as {
  cliente: { findUnique: jest.Mock; update: jest.Mock }
}

const mockRequirePermission = requireClientePermission as jest.Mock
const mockGetDeps = getClientesBlockingDependenciesMap as jest.Mock
const mockHasBlocking = hasBlockingDependencies as jest.Mock
const mockBuildDetails = buildClienteDependencyConflictDetails as jest.Mock

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/clientes/${id}/toggle-status`, {
    method: 'PUT',
  })
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('/api/clientes/[id]/toggle-status - PUT', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: '1', role: 'ADMIN' })
    mockGetDeps.mockResolvedValue(new Map())
    mockHasBlocking.mockReturnValue(false)
    mockBuildDetails.mockReturnValue({})
  })

  it('toggles ATIVO → INATIVO when no dependencies', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({
      id: 5, status: 'ATIVO', tipo: 'PF', nomeCompleto: 'John Doe', nomeFantasia: null, razaoSocial: null,
    })
    mockPrisma.cliente.update.mockResolvedValue({ id: 5, status: 'INATIVO' })

    const res = await PUT(makeRequest('5'), makeContext('5'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('INATIVO')
    expect(mockPrisma.cliente.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'INATIVO', ativo: false }) })
    )
  })

  it('toggles INATIVO → ATIVO without dependency check', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({
      id: 5, status: 'INATIVO', tipo: 'PF', nomeCompleto: 'John Doe', nomeFantasia: null, razaoSocial: null,
    })
    mockPrisma.cliente.update.mockResolvedValue({ id: 5, status: 'ATIVO' })

    const res = await PUT(makeRequest('5'), makeContext('5'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.status).toBe('ATIVO')
    // No dependency check needed when activating
    expect(mockGetDeps).not.toHaveBeenCalled()
  })

  it('returns 409 when ATIVO → INATIVO and client has dependencies', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({
      id: 5, status: 'ATIVO', tipo: 'PF', nomeCompleto: 'John Doe', nomeFantasia: null, razaoSocial: null,
    })
    const depMap = new Map([[5, { activeServiceOrders: 2, activeProjetos: 0, activeInvoices: 0 }]])
    mockGetDeps.mockResolvedValue(depMap)
    mockHasBlocking.mockReturnValue(true)
    mockBuildDetails.mockReturnValue({ activeServiceOrders: 2 })

    const res = await PUT(makeRequest('5'), makeContext('5'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Conflict')
    expect(mockPrisma.cliente.update).not.toHaveBeenCalled()
  })

  it('returns 404 when client does not exist', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null)

    const res = await PUT(makeRequest('999'), makeContext('999'))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.success).toBe(false)
  })

  it('returns 422 on invalid id param', async () => {
    const res = await PUT(makeRequest('abc'), makeContext('abc'))
    expect(res.status).toBe(422)
  })

  it('includes client name in success message for PJ', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({
      id: 7, status: 'INATIVO', tipo: 'PJ', nomeCompleto: null, nomeFantasia: 'Acme Corp', razaoSocial: 'Acme LLC',
    })
    mockPrisma.cliente.update.mockResolvedValue({})

    const res = await PUT(makeRequest('7'), makeContext('7'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.message).toContain('Acme Corp')
  })
})
