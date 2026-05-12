 
import { POST } from '../../../app/api/auth/first-access/setup/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    json: jest.fn(),
    headers: { get: jest.fn() },
    cookies: { get: jest.fn() },
    ...options,
  })),
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
    $executeRaw: jest.fn(),
  },
}))

jest.mock('../../../shared/lib/jwt', () => ({
  verifyAuthJWT: jest.fn(),
}))

jest.mock('../../../shared/lib/password', () => ({
  PasswordService: {
    validatePassword: jest.fn(),
    hashPassword: jest.fn().mockResolvedValue('$2b$12$hashed'),
  },
}))

jest.mock('../../../shared/lib/audit', () => ({
  AuditLogger: {
    logFirstAccess: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../../shared/lib/rate-limit', () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  })),
}))

// Mock do EmailService via dynamic import
jest.mock('../../../shared/lib/email', () => ({
  EmailService: {
    send: jest.fn().mockResolvedValue({ success: true }),
  },
}))

const validBody = {
  userId: 10,
  newPassword: 'SenhaForte@123',
  pin: '1234',
  securityQuestion: 'Nome do pet?',
  securityAnswer: 'rex',
}

const validUser = {
  id: 10,
  primeiroAcesso: true,
  email: 'novo@gladpros.com',
  nomeCompleto: 'Novo Usuário',
}

describe('POST /api/auth/first-access/setup', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/jwt').verifyAuthJWT.mockResolvedValue({ sub: '10' })
    require('../../../shared/lib/password').PasswordService.validatePassword.mockReturnValue({ valid: true, errors: [] })
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([validUser])
    require('../../../lib/prisma').prisma.$executeRaw.mockResolvedValue(1)

    mockRequest = {
      url: 'http://localhost/api/auth/first-access/setup',
      json: jest.fn().mockResolvedValue(validBody),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
      cookies: { get: jest.fn().mockReturnValue({ value: 'valid-jwt-token' }) },
    } as unknown as NextRequest
  })

  it('retorna 401 quando não há authToken no cookie', async () => {
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined)
    const response = await POST(mockRequest)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toContain('Sessão inválida')
  })

  it('retorna 401 quando JWT é inválido', async () => {
    require('../../../shared/lib/jwt').verifyAuthJWT.mockRejectedValue(new Error('invalid signature'))
    const response = await POST(mockRequest)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toContain('Sessão expirada')
  })

  it('retorna 400 para body inválido', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({})
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('retorna 403 quando userId do body difere do JWT (proteção anti account-takeover)', async () => {
    require('../../../shared/lib/jwt').verifyAuthJWT.mockResolvedValue({ sub: '99' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toContain('Sessão inválida')
  })

  it('retorna 400 quando senha não atende critérios de segurança', async () => {
    require('../../../shared/lib/password').PasswordService.validatePassword.mockReturnValue({
      valid: false,
      errors: ['Mínimo 8 caracteres'],
    })
    // Usar senha que passa Zod (min 6, lower + upper/digit) mas falha PasswordService
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ ...validBody, newPassword: 'SenhaValida1' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Mínimo 8 caracteres')
  })

  it('retorna 400 quando PIN não tem 4 dígitos', async () => {
    // Zod pinSchema valida antes da lógica manual — testar com valor que falha Zod
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ ...validBody, pin: '12' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    // Zod retorna a mensagem genérica quando pinSchema falha
    expect(data.success).toBe(false)
  })

  it('retorna 400 quando resposta de segurança é muito curta', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ ...validBody, securityAnswer: 'ab' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('pelo menos 3 caracteres')
  })

  it('retorna 404 quando usuário não encontrado no banco', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    const response = await POST(mockRequest)
    expect(response.status).toBe(404)
  })

  it('retorna 400 quando usuário já completou primeiro acesso', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...validUser, primeiroAcesso: false },
    ])
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('já completou')
  })

  it('retorna 200 e configura conta com sucesso', async () => {
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.user.primeiroAcesso).toBe(false)
    expect(data.user.id).toBe(validUser.id)
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled()
    expect(require('../../../shared/lib/audit').AuditLogger.logFirstAccess).toHaveBeenCalled()
  })

  it('retorna 200 mesmo quando envio de email de confirmação falha', async () => {
    require('../../../shared/lib/email').EmailService.send.mockRejectedValue(new Error('SMTP error'))
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
