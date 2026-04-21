/* eslint-disable @typescript-eslint/no-require-imports */
import { GET, DELETE } from '../../../app/api/propostas/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url, json: jest.fn(), headers: { get: jest.fn() }, ...options,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map(),
    })),
  },
}))

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    proposta: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      $transaction: jest.fn(),
    },
    propostaMaterial: { deleteMany: jest.fn(), createMany: jest.fn() },
    propostaEtapa: { deleteMany: jest.fn(), createMany: jest.fn() },
  },
}))

jest.mock('../../../shared/lib/rbac', () => ({ requireUser: jest.fn() }))
jest.mock('../../../shared/lib/rbac-core', () => ({ can: jest.fn() }))
jest.mock('../../../components/propostas/adapter', () => ({ adaptPropostaFormToAPI: jest.fn() }))
jest.mock('../../../schemas/proposta.schema', () => ({ updatePropostaSchema: { parse: jest.fn() } }))

const mockUser = { id: '1', role: 'ADMIN', status: 'ATIVO' }
const mockProposta = { id: 1, numeroProposta: 'PROP-001', titulo: 'Proposta', status: 'RASCUNHO', PropostaMaterial: [], PropostaEtapa: [], Cliente: {} }

function makeReq(id = '1'): NextRequest {
  return {
    url: `http://localhost/api/propostas/${id}`,
    json: jest.fn().mockResolvedValue({}),
    headers: { get: jest.fn() },
  } as unknown as NextRequest
}

const makeParams = (id = '1') => ({ params: Promise.resolve({ id }) })

describe('GET /api/propostas/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(mockUser)
    require('../../../shared/lib/rbac-core').can.mockReturnValue(true)
    require('../../../lib/prisma').prisma.proposta.findUnique.mockResolvedValue(mockProposta)
  })

  it('retorna 401 sem autenticação', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando role sem permissão', async () => {
    require('../../../shared/lib/rbac-core').can.mockReturnValue(false)
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(403)
  })

  it('retorna 400 para ID inválido', async () => {
    const res = await GET(makeReq('abc'), makeParams('abc'))
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando proposta não encontrada', async () => {
    require('../../../lib/prisma').prisma.proposta.findUnique.mockResolvedValue(null)
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it('retorna 200 com proposta para ADMIN', async () => {
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })
})

describe('DELETE /api/propostas/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(mockUser)
    require('../../../shared/lib/rbac-core').can.mockReturnValue(true)
    require('../../../lib/prisma').prisma.proposta.findFirst.mockResolvedValue(mockProposta)
    require('../../../lib/prisma').prisma.proposta.update.mockResolvedValue({})
  })

  it('retorna 401 sem autenticação', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const res = await DELETE(makeReq(), makeParams())
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando role sem permissão de deleção', async () => {
    require('../../../shared/lib/rbac-core').can.mockReturnValue(false)
    const res = await DELETE(makeReq(), makeParams())
    expect(res.status).toBe(403)
  })

  it('retorna 404 quando proposta não encontrada', async () => {
    require('../../../lib/prisma').prisma.proposta.findFirst.mockResolvedValue(null)
    const res = await DELETE(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it('retorna 400 quando proposta não está em estado deletável', async () => {
    require('../../../lib/prisma').prisma.proposta.findFirst.mockResolvedValue({
      ...mockProposta, status: 'ENVIADA'
    })
    const res = await DELETE(makeReq(), makeParams())
    expect(res.status).toBe(400)
  })

  it('retorna 200 ao deletar proposta em RASCUNHO', async () => {
    const res = await DELETE(makeReq(), makeParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(require('../../../lib/prisma').prisma.proposta.update).toHaveBeenCalled()
  })

  it('retorna 200 ao deletar proposta CANCELADA', async () => {
    require('../../../lib/prisma').prisma.proposta.findFirst.mockResolvedValue({
      ...mockProposta, status: 'CANCELADA'
    })
    const res = await DELETE(makeReq(), makeParams())
    expect(res.status).toBe(200)
  })
})
