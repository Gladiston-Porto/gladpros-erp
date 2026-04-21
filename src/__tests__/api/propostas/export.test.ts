/* eslint-disable @typescript-eslint/no-require-imports */
import { POST as PostPDF } from '../../../app/api/propostas/export/pdf/route'
import { POST as PostCSV } from '../../../app/api/propostas/export/csv/route'
import { NextRequest } from 'next/server'

// Mock que cobre tanto NextResponse.json() quanto new NextResponse(body, init)
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number
    headers: Map<string, string>
    _body: unknown

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body
      this.status = init?.status || 200
      this.headers = new Map(Object.entries(init?.headers || {}))
    }

    async json() { return this._body }
    async text() { return String(this._body) }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, { status: init?.status })
    }
  }

  return {
    NextRequest: jest.fn().mockImplementation((url: string, options: unknown) => ({
      url, json: jest.fn(), headers: { get: jest.fn() }, ...(options as object || {}),
    })),
    NextResponse: MockNextResponse,
  }
})

jest.mock('../../../lib/prisma', () => ({
  prisma: { proposta: { findMany: jest.fn() } },
}))
jest.mock('../../../shared/lib/rbac', () => ({ requireUser: jest.fn() }))
jest.mock('../../../shared/lib/rbac-core', () => ({ can: jest.fn() }))

const mockUser = { id: '1', role: 'ADMIN', status: 'ATIVO' }

function makeReq(body = {}): NextRequest {
  return {
    url: 'http://localhost/api/propostas/export',
    json: jest.fn().mockResolvedValue(body),
    headers: { get: jest.fn() },
  } as unknown as NextRequest
}

describe('POST /api/propostas/export/pdf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(mockUser)
    require('../../../shared/lib/rbac-core').can.mockReturnValue(true)
    require('../../../lib/prisma').prisma.proposta.findMany.mockResolvedValue([])
  })

  it('retorna 401 sem autenticação', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const res = await PostPDF(makeReq())
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando role sem permissão', async () => {
    require('../../../shared/lib/rbac-core').can.mockReturnValue(false)
    const res = await PostPDF(makeReq())
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('não gera 500 ao receber filtro com caracteres especiais', async () => {
    const req = makeReq({ filters: { q: '<script>alert("xss")</script>' } })
    const res = await PostPDF(req)
    expect(res.status).not.toBe(500)
  })

  it('retorna 200 com HTML quando autenticado e sem propostas', async () => {
    const res = await PostPDF(makeReq({ filters: {} }))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/propostas/export/csv', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(mockUser)
    require('../../../shared/lib/rbac-core').can.mockReturnValue(true)
    require('../../../lib/prisma').prisma.proposta.findMany.mockResolvedValue([])
  })

  it('retorna 401 sem autenticação', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const res = await PostCSV(makeReq())
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando role sem permissão', async () => {
    require('../../../shared/lib/rbac-core').can.mockReturnValue(false)
    const res = await PostCSV(makeReq())
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('retorna 200 com CSV quando autenticado', async () => {
    require('../../../lib/prisma').prisma.proposta.findMany.mockResolvedValue([{
      numeroProposta: 'PROP-001',
      titulo: 'Teste',
      status: 'RASCUNHO',
      precoPropostaCliente: null,
      valorEstimado: 1000,
      criadoEm: new Date(),
      validadeProposta: null,
      assinadaEm: null,
      contatoNome: 'João',
      contatoEmail: 'joao@test.com',
      localExecucaoEndereco: '123 Main St',
      Cliente: { nomeCompleto: 'Cliente Teste', email: 'c@test.com' }
    }])
    const res = await PostCSV(makeReq())
    expect(res.status).toBe(200)
  })
})
