/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  hasRole: jest.fn(),
}))

jest.mock('@/shared/lib/audit', () => ({
  AuditService: {
    getEntityHistory: jest.fn(),
  },
}))

import { GET } from '@/app/api/clientes/[id]/audit/route'
import { requireUser, hasRole } from '@/shared/lib/rbac'
import { AuditService } from '@/shared/lib/audit'

const mockRequireUser = requireUser as jest.Mock
const mockHasRole = hasRole as jest.Mock
const mockGetHistory = AuditService.getEntityHistory as jest.Mock

const sampleHistory = [
  {
    id: 100,
    acao: 'CREATE',
    diff: JSON.stringify({ nomeCompleto: { old: null, new: 'John Doe' } }),
    timestamp: new Date('2025-06-01T10:00:00Z'),
    usuario: { id: 1, nomeCompleto: 'Admin User', email: 'admin@gladpros.com' },
  },
  {
    id: 101,
    acao: 'UPDATE',
    diff: JSON.stringify({ email: { old: 'old@e.com', new: 'new@e.com' } }),
    timestamp: new Date('2025-06-02T15:00:00Z'),
    usuario: { id: 1, nomeCompleto: 'Admin User', email: 'admin@gladpros.com' },
  },
]

function makeRequest(id: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost/api/clientes/${id}/audit`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('/api/clientes/[id]/audit - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue({ id: '1', role: 'ADMIN' })
    mockHasRole.mockReturnValue(true)
    mockGetHistory.mockResolvedValue(sampleHistory)
  })

  it('returns audit history for ADMIN', async () => {
    const res = await GET(makeRequest('5'), makeContext('5'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(2)
    expect(json.data[0].acao).toBe('CREATE')
  })

  it('parses diff JSON from string', async () => {
    const res = await GET(makeRequest('5'), makeContext('5'))
    const json = await res.json()
    expect(typeof json.data[0].diff).toBe('object')
    expect(json.data[0].diff).toHaveProperty('nomeCompleto')
  })

  it('returns usuario name (not full object)', async () => {
    const res = await GET(makeRequest('5'), makeContext('5'))
    const json = await res.json()
    expect(json.data[0].usuario.nome).toBe('Admin User')
    expect(json.data[0].usuario).not.toHaveProperty('email')
  })

  it('returns 200 when role is USUARIO (has read access to clientes)', async () => {
    mockRequireUser.mockResolvedValue({ id: '5', role: 'USUARIO' })
    const res = await GET(makeRequest('5'), makeContext('5'))
    expect(res.status).toBe(200)
  })

  it('returns 200 when role is FINANCEIRO (has read access to clientes)', async () => {
    mockRequireUser.mockResolvedValue({ id: '3', role: 'FINANCEIRO' })
    const res = await GET(makeRequest('5'), makeContext('5'))
    expect(res.status).toBe(200)
  })

  it('returns 422 on invalid id param', async () => {
    const res = await GET(makeRequest('not-a-number'), makeContext('not-a-number'))
    expect(res.status).toBe(422)
  })

  it('returns empty array for client with no history', async () => {
    mockGetHistory.mockResolvedValue([])
    const res = await GET(makeRequest('42'), makeContext('42'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(0)
  })

  it('respects limit query param', async () => {
    await GET(makeRequest('5', { limit: '10' }), makeContext('5'))
    expect(mockGetHistory).toHaveBeenCalledWith('Cliente', 5, 10)
  })

  it('handles null diff gracefully', async () => {
    mockGetHistory.mockResolvedValue([{ ...sampleHistory[0], diff: null }])
    const res = await GET(makeRequest('5'), makeContext('5'))
    const json = await res.json()
    expect(json.data[0].diff).toBeNull()
  })
})
