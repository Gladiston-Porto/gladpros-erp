/* eslint-disable @typescript-eslint/no-require-imports */
import { GET, POST } from '../../../app/api/propostas/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn(),
    headers: { get: jest.fn() },
    ...options,
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
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    numeracaoProposta: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((fn) => {
      if (typeof fn === 'function') {
        const tx = {
          proposta: {
            findFirst: jest.fn().mockResolvedValue(null),
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 1, numeroProposta: 'GP-202501-00001' }),
          },
          numeracaoProposta: {
            findFirst: jest.fn().mockResolvedValue(null),
            upsert: jest.fn(),
          },
        };
        return fn(tx);
      }
      return Promise.all(fn);
    }),
  },
}))

jest.mock('../../../shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('../../../shared/lib/rate-limit', () => ({
  apiRateLimit: { isAllowed: jest.fn() },
}))

jest.mock('../../../lib/api/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

jest.mock('../../../shared/lib/rbac-core', () => ({
  can: jest.fn(),
}))

jest.mock('../../../components/propostas/adapter', () => ({
  adaptPropostaFormToAPI: jest.fn(),
}))

jest.mock('../../../schemas/proposta.schema', () => ({
  createPropostaSchema: { parse: jest.fn() },
}))

const mockUser = { id: '1', role: 'ADMIN', status: 'ATIVO' }

describe('GET /api/propostas', () => {
  let req: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(mockUser)
    require('../../../shared/lib/rbac-core').can.mockReturnValue(true)
    require('../../../shared/lib/rate-limit').apiRateLimit.isAllowed.mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 })
    require('../../../lib/prisma').prisma.proposta.findMany.mockResolvedValue([])
    require('../../../lib/prisma').prisma.proposta.count.mockResolvedValue(0)

    req = {
      url: 'http://localhost/api/propostas',
      json: jest.fn(),
      headers: { get: jest.fn() },
    } as unknown as NextRequest
  })

  it('retorna 401 sem autenticação', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando role sem permissão', async () => {
    require('../../../shared/lib/rbac-core').can.mockReturnValue(false)
    const res = await GET(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('retorna 200 com lista paginada para ADMIN', async () => {
    const mockPropostas = [
      {
        id: 1, numeroProposta: 'PROP-001', titulo: 'Proposta Teste',
        status: 'RASCUNHO', valorEstimado: null, criadoEm: new Date(),
        Cliente: { id: 1, nomeCompleto: 'Cliente A', email: 'a@test.com' },
        _count: { PropostaEtapa: 0, PropostaMaterial: 0, AnexoProposta: 0 }
      }
    ]
    require('../../../lib/prisma').prisma.proposta.findMany.mockResolvedValue(mockPropostas)
    require('../../../lib/prisma').prisma.proposta.count.mockResolvedValue(1)

    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.pagination).toBeDefined()
    expect(data.pagination.total).toBe(1)
  })

  it('retorna success:false quando role não tem acesso', async () => {
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue({ id: '5', role: 'USUARIO', status: 'ATIVO' })
    require('../../../shared/lib/rbac-core').can.mockReturnValue(false)
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/propostas', () => {
  let req: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(mockUser)
    require('../../../shared/lib/rbac-core').can.mockReturnValue(true)
    require('../../../shared/lib/rate-limit').apiRateLimit.isAllowed.mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 })
    require('../../../components/propostas/adapter').adaptPropostaFormToAPI.mockReturnValue({
      clienteId: 1, titulo: 'Nova Proposta', valorEstimado: 1000,
      status: 'RASCUNHO', materiais: [], etapas: [],
    })
    require('../../../schemas/proposta.schema').createPropostaSchema.parse.mockReturnValue({
      identificacao: { clienteId: 1, titulo: 'Nova Proposta' }
    })
    require('../../../lib/prisma').prisma.proposta.create.mockResolvedValue({
      id: 1, numeroProposta: 'PROP-001', titulo: 'Nova Proposta',
      Cliente: {}, PropostaMaterial: [], PropostaEtapa: []
    })

    req = {
      url: 'http://localhost/api/propostas',
      json: jest.fn().mockResolvedValue({ identificacao: { clienteId: 1 } }),
      headers: { get: jest.fn() },
    } as unknown as NextRequest
  })

  it('retorna 429 quando rate limit atingido', async () => {
    require('../../../shared/lib/rate-limit').apiRateLimit.isAllowed.mockResolvedValue({ allowed: false, message: 'Muitas requisições', remaining: 0, resetTime: Date.now() + 60000 })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('retorna 401 sem autenticação', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando role sem permissão de criação', async () => {
    require('../../../shared/lib/rbac-core').can.mockReturnValue(false)
    const res = await POST(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('retorna 201 com proposta criada para ADMIN', async () => {
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('retorna 201 com proposta criada para GERENTE', async () => {
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue({ id: '2', role: 'GERENTE', status: 'ATIVO' })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
