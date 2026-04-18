/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findMany: jest.fn(),
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
  maskDocumento: jest.fn((enc: string) => `***-**-${enc.slice(-4)}`),
}))

jest.mock('@/shared/lib/audit', () => ({
  AuditService: {
    logAction: jest.fn().mockResolvedValue(undefined),
  },
}))

import { POST } from '@/app/api/clientes/export/csv/route'
import { prisma } from '@/lib/prisma'
import { requireClientePermission } from '@/shared/lib/rbac'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import { AuditService } from '@/shared/lib/audit'

const mockPrisma = prisma as { cliente: { findMany: jest.Mock } }
const mockRequirePermission = requireClientePermission as jest.Mock
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock
const mockAudit = AuditService.logAction as jest.Mock

const sampleCliente = {
  id: 1,
  tipo: 'PF',
  nomeCompleto: 'Alice Tester',
  razaoSocial: null,
  nomeFantasia: null,
  email: 'alice@test.com',
  telefone: '(469) 555-0001',
  documentoEnc: 'encABCD1234',
  docLast4: '1234',
  status: 'ATIVO',
  addressStreet: '100 Main St',
  addressCity: 'Dallas',
  addressState: 'TX',
  addressZip: '75201',
  addressCounty: 'Dallas County',
  criadoEm: new Date('2025-01-15T12:00:00Z'),
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/clientes/export/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/clientes/export/csv - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockResolvedValue({ allowed: true })
    mockRequirePermission.mockResolvedValue({ id: '1', role: 'ADMIN' })
    mockPrisma.cliente.findMany.mockResolvedValue([sampleCliente])
  })

  it('returns CSV content type and data', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/text\/csv/)
    const text = await res.text()
    expect(text).toContain('Alice Tester')
  })

  it('includes CSV header row', async () => {
    const res = await POST(makeRequest({}))
    const text = await res.text()
    expect(text.toLowerCase()).toMatch(/nome|email|tipo/i)
  })

  it('returns 400 when no clients found', async () => {
    mockPrisma.cliente.findMany.mockResolvedValue([])
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('calls AuditService after successful export', async () => {
    await POST(makeRequest({}))
    // Audit is fire-and-forget — use microtask flush
    await Promise.resolve()
    expect(mockAudit).toHaveBeenCalled()
  })

  it('filters by selectedIds when provided', async () => {
    await POST(makeRequest({ selectedIds: [1, 2] }))
    expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: [1, 2] } }) })
    )
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, message: 'Muitas requisições' })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(429)
  })
})
