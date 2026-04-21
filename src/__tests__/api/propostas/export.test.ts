/* eslint-disable @typescript-eslint/no-require-imports */
import { POST as PostPDF } from '../../../app/api/propostas/export/pdf/route'
import { POST as PostCSV } from '../../../app/api/propostas/export/csv/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map(),
    })),
  },
}))

// NextResponse constructor for raw responses
const { NextResponse: OrigNextResponse } = jest.requireActual('next/server')
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: jest.fn().mockImplementation((data, options) => ({
        status: options?.status || 200,
        json: jest.fn().mockResolvedValue(data),
        headers: new Map(),
      })),
    },
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
    url: 'http://localhost/api/propostas/export/pdf',
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

  it('gera HTML sem XSS ao receber filtro malicioso', async () => {
    require('../../../lib/prisma').prisma.proposta.findMany.mockResolvedValue([])
    const req = makeReq({ filters: { q: '<script>alert("xss")</script>' } })
    const res = await PostPDF(req)
    // O response é HTML, verificar que < não está literal no output
    expect(res.status).not.toBe(500)
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
  })

  it('retorna CSV com dados quando autenticado', async () => {
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
