 
import { POST } from '../../../app/api/auth/reset-password/route'
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

jest.mock('../../../shared/lib/tokens', () => ({
  sha256Hex: jest.fn().mockReturnValue('hashed-token'),
}))

jest.mock('../../../shared/lib/password', () => ({
  PasswordService: {
    validatePassword: jest.fn(),
    hashPassword: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  },
}))

jest.mock('../../../shared/lib/security', () => ({
  SecurityService: {
    isPasswordReused: jest.fn().mockResolvedValue(false),
    addPasswordToHistory: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../../shared/lib/audit', () => ({
  AuditLogger: {
    logPasswordChange: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../../lib/auth/token-service', () => ({
  revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../../shared/lib/rate-limit', () => ({
  resetPasswordRateLimit: { isAllowed: jest.fn() },
}))

const validToken = 'valid-reset-token-abc'
const validTokenRecord = {
  id: 1,
  userId: 42,
  expiresAt: new Date(Date.now() + 3600_000),
  used: false,
}

describe('POST /api/auth/reset-password', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rate-limit').resetPasswordRateLimit.isAllowed.mockResolvedValue({ allowed: true })
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([validTokenRecord])
    require('../../../lib/prisma').prisma.$executeRaw.mockResolvedValue(1)
    require('../../../shared/lib/password').PasswordService.validatePassword.mockReturnValue({ valid: true, errors: [] })

    mockRequest = {
      url: 'http://localhost/api/auth/reset-password',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
    } as unknown as NextRequest
  })

  it('retorna 429 quando rate limit atingido', async () => {
    require('../../../shared/lib/rate-limit').resetPasswordRateLimit.isAllowed.mockResolvedValue({
      allowed: false,
      message: 'Muitas tentativas',
    })
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ token: validToken, senha: 'SenhaForte@123' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(429)
  })

  it('retorna 400 para body inválido (campos ausentes)', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({})
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('retorna 400 quando token não encontrado no banco', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ token: 'token-invalido', senha: 'SenhaForte@123' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Token inválido')
  })

  it('retorna 400 quando token já foi utilizado', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([{ ...validTokenRecord, used: true }])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ token: validToken, senha: 'SenhaForte@123' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Token já utilizado')
  })

  it('retorna 400 quando token expirado', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([{
      ...validTokenRecord,
      expiresAt: new Date(Date.now() - 1000),
    }])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ token: validToken, senha: 'SenhaForte@123' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Token expirado')
  })

  it('retorna 400 quando senha não atende critérios de segurança', async () => {
    require('../../../shared/lib/password').PasswordService.validatePassword.mockReturnValue({
      valid: false,
      errors: ['Senha muito curta'],
    })
    // Usar senha que passa Zod (min 6, tem lower + upper/digit) mas falha no PasswordService
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ token: validToken, senha: 'SenhaValida1' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Senha muito curta')
  })

  it('retorna 400 quando senha foi reutilizada recentemente', async () => {
    require('../../../shared/lib/security').SecurityService.isPasswordReused.mockResolvedValue(true)
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ token: validToken, senha: 'SenhaForte@123' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('já foi utilizada')
  })

  it('retorna 200 e invalida sessões após reset bem-sucedido', async () => {
    require('../../../shared/lib/password').PasswordService.validatePassword.mockReturnValue({ valid: true, errors: [] })
    require('../../../shared/lib/security').SecurityService.isPasswordReused.mockResolvedValue(false)
    require('../../../lib/prisma').prisma.$queryRaw.mockImplementation(() =>
      Promise.resolve([validTokenRecord])
    )
    require('../../../lib/prisma').prisma.$executeRaw.mockResolvedValue(1)
    require('../../../lib/auth/token-service').revokeAllUserTokens.mockResolvedValue(undefined)
    require('../../../shared/lib/audit').AuditLogger.logPasswordChange.mockResolvedValue(undefined)
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ token: validToken, senha: 'SenhaForte@123' })

    const response = await POST(mockRequest)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(require('../../../lib/auth/token-service').revokeAllUserTokens).toHaveBeenCalled()
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled()
  })
})
