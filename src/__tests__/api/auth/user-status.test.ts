 
import { POST } from '../../../app/api/auth/user-status/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map(),
      cookies: { set: jest.fn() },
    })),
  },
}))

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}))

jest.mock('../../../shared/lib/rate-limit', () => {
  // isAllowed definida DENTRO do factory — sem TDZ, sem problemas de hoisting
  const isAllowedFn = jest.fn().mockResolvedValue({ allowed: true })
  return {
    RateLimiter: jest.fn().mockImplementation(() => ({ isAllowed: isAllowedFn })),
    // Expor para acesso nos testes via require()
    __isAllowed: isAllowedFn,
  }
})

const BLOCKED_USER = {
  id: 5,
  email: 'bloqueado@gladpros.com',
  nomeCompleto: 'Usuário Bloqueado',
  bloqueado: true,
  pinSeguranca: '$2b$12$hashpin123',
  perguntaSecreta: 'Qual o nome do seu primeiro pet?',
}

describe('POST /api/auth/user-status', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    // Restaurar comportamento padrão do rate limiter após clearAllMocks
     
    const { __isAllowed } = require('../../../shared/lib/rate-limit') as any
    __isAllowed.mockResolvedValue({ allowed: true })
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([BLOCKED_USER])

    mockRequest = {
      url: 'http://localhost/api/auth/user-status',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
    } as unknown as NextRequest
  })

  // ---- Rate limit ----------------------------------------------------------

  it('retorna 429 quando o rate limit é excedido', async () => {
     
    const { __isAllowed } = require('../../../shared/lib/rate-limit') as any
    __isAllowed.mockResolvedValueOnce({
      allowed: false,
      message: 'Muitas solicitações. Aguarde um momento.',
    })
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: BLOCKED_USER.email })
    const response = await POST(mockRequest)
    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Muitas solicitações')
  })

  // ---- Validação -----------------------------------------------------------

  it('retorna 400 para body sem email', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({})
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Email é obrigatório')
  })

  it('retorna 400 para email com formato inválido', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'invalido' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('retorna 400 quando json() retorna objeto vazio (body malformado)', async () => {
    ;(mockRequest.json as jest.Mock).mockRejectedValue(new SyntaxError('Unexpected end'))
    const response = await POST(mockRequest)
    // json().catch(() => ({})) → {} → falha na validação → 400
    expect(response.status).toBe(400)
  })

  // ---- Anti-enumeration ----------------------------------------------------

  it('retorna blocked:false quando usuário não existe (não revela existência)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'naoexiste@gladpros.com' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.blocked).toBe(false)
    expect(data.success).toBe(true)
    expect(data.user).toBeUndefined() // não revelar dados do usuário
  })

  // ---- Usuário desbloqueado ------------------------------------------------

  it('retorna blocked:false quando usuário existe mas não está bloqueado', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...BLOCKED_USER, bloqueado: false },
    ])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: BLOCKED_USER.email })
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.blocked).toBe(false)
    expect(data.user).toBeUndefined()
  })

  // ---- Usuário bloqueado ---------------------------------------------------

  it('retorna blocked:true com detalhes de desbloqueio quando bloqueado com PIN e questão', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: BLOCKED_USER.email })
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.blocked).toBe(true)
    expect(data.success).toBe(true)
    expect(data.user.id).toBe(BLOCKED_USER.id)
    expect(data.user.email).toBe(BLOCKED_USER.email)
    expect(data.user.nomeCompleto).toBe(BLOCKED_USER.nomeCompleto)
    expect(data.user.requiresPinUnlock).toBe(true)
    expect(data.user.requiresSecurityQuestion).toBe(true)
    expect(data.user.perguntaSecreta).toBe(BLOCKED_USER.perguntaSecreta)
  })

  it('retorna requiresPinUnlock:false quando usuário bloqueado não tem PIN cadastrado', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...BLOCKED_USER, pinSeguranca: null },
    ])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: BLOCKED_USER.email })
    const response = await POST(mockRequest)
    const data = await response.json()
    expect(data.user.requiresPinUnlock).toBe(false)
    expect(data.user.requiresSecurityQuestion).toBe(true)
  })

  it('retorna requiresSecurityQuestion:false quando usuário bloqueado não tem questão de segurança', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...BLOCKED_USER, perguntaSecreta: null },
    ])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: BLOCKED_USER.email })
    const response = await POST(mockRequest)
    const data = await response.json()
    expect(data.user.requiresSecurityQuestion).toBe(false)
    expect(data.user.perguntaSecreta).toBeNull()
  })
})
