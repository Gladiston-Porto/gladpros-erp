/* eslint-disable @typescript-eslint/no-require-imports */
import { POST } from '../../../app/api/auth/mfa/resend/route'
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
  },
}))

jest.mock('../../../shared/lib/mfa', () => ({
  MFAService: {
    countRecentAttempts: jest.fn().mockResolvedValue(0),
    createMFACode: jest.fn().mockResolvedValue({ code: '654321', id: 10 }),
  },
}))

jest.mock('../../../shared/lib/email', () => ({
  EmailService: {
    sendMFA: jest.fn().mockResolvedValue({ success: true }),
    prewarm: jest.fn(),
  },
}))

jest.mock('../../../lib/api/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const mockUser = {
  id: 1,
  email: 'user@example.com',
  nomeCompleto: 'Test User',
  primeiroAcesso: false,
  status: 'ATIVO',
}

describe('POST /api/auth/mfa/resend', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()

    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([mockUser])
    require('../../../shared/lib/mfa').MFAService.countRecentAttempts.mockResolvedValue(0)
    require('../../../shared/lib/mfa').MFAService.createMFACode.mockResolvedValue({ code: '654321', id: 10 })

    mockRequest = {
      url: 'http://localhost/api/auth/mfa/resend',
      method: 'POST',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue(null) },
    } as unknown as NextRequest
  })

  it('should return 400 for missing userId', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({})

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID do usuário é obrigatório')
    expect(data.success).toBe(false)
  })

  it('should return 404 when user not found', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 999 })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Usuário não encontrado')
    expect(data.success).toBe(false)
  })

  it('should return 401 for inactive user', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...mockUser, status: 'INATIVO' },
    ])

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1 })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Conta inativa')
    expect(data.success).toBe(false)
  })

  it('should return 429 when too many recent attempts', async () => {
    require('../../../shared/lib/mfa').MFAService.countRecentAttempts.mockResolvedValue(3)

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1 })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Muitas solicitações')
  })

  it('should return success with masked email', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1 })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Novo código enviado com sucesso')
    // Email deve estar mascarado — nunca retornar email completo
    expect(data.email).toMatch(/\*{3}/)
    // Código MFA jamais deve ser retornado na resposta
    expect(data.code).toBeUndefined()
  })

  it('should NOT expose MFA code in response even on success', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1 })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(data.code).toBeUndefined()
    expect(data.mfaCode).toBeUndefined()
  })
})
