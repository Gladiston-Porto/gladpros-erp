/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    empresa: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        nome: 'GladPros LLC',
        tipoTributacao: 'LLC_DEFAULT',
        tipoTributacaoDesde: new Date(),
      }),
      update: jest.fn().mockResolvedValue({ id: 1, tipoTributacao: 'S_CORP' }),
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

import { GET, PUT } from '@/app/api/financeiro/tax/regime/route'
import { requireUser } from '@/shared/lib/rbac'
import { can } from '@/shared/lib/rbac-core'

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>
const mockCan = can as jest.MockedFunction<typeof can>

describe('GET /api/financeiro/tax/regime', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/tax/regime')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks financeiro.read permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'USUARIO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/tax/regime')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 with tax regime for authorized user', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(true)
    const req = new NextRequest('http://localhost/api/financeiro/tax/regime')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tipoTributacao).toBe('LLC_DEFAULT')
  })
})

describe('PUT /api/financeiro/tax/regime', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const req = new NextRequest('http://localhost/api/financeiro/tax/regime', {
      method: 'PUT',
      body: JSON.stringify({ tipoTributacao: 'S_CORP' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks configuracoes.update permission', async () => {
    mockRequireUser.mockResolvedValue({ id: '1', role: 'FINANCEIRO', status: 'ATIVO' } as any)
    mockCan.mockReturnValue(false)
    const req = new NextRequest('http://localhost/api/financeiro/tax/regime', {
      method: 'PUT',
      body: JSON.stringify({ tipoTributacao: 'S_CORP' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(403)
  })
})
