 
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

jest.mock('../../../shared/lib/mfa-challenge', () => ({
  createMfaChallenge: jest.fn().mockReturnValue('rotated-challenge'),
  verifyMfaChallenge: jest.fn().mockReturnValue(true),
}))

jest.mock('../../../shared/lib/rate-limit', () => ({
  mfaRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
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
    require('../../../shared/lib/rate-limit').mfaRateLimit.isAllowed.mockResolvedValue({ allowed: true })
    require('../../../shared/lib/mfa-challenge').verifyMfaChallenge.mockReturnValue(true)

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

  it('should return 401 when MFA challenge is invalid or expired', async () => {
    require('../../../shared/lib/mfa-challenge').verifyMfaChallenge.mockReturnValue(false)

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1, challenge: 'tampered-challenge' })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('MFA_CHALLENGE_INVALID')
    expect(data.success).toBe(false)
  })

  it('should return 429 when request rate limit (mfaRateLimit) is exceeded', async () => {
    require('../../../shared/lib/rate-limit').mfaRateLimit.isAllowed.mockResolvedValue({
      allowed: false,
      message: 'Too many requests',
    })

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1, challenge: 'valid-challenge' })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
  })

  // Security by design: the route returns 200 generic for both "user not found" and
  // "inactive user" to prevent user enumeration attacks.
  it('should return 200 (generic) when user is not found — prevents user enumeration', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 999, challenge: 'valid-challenge' })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 200 (generic) for inactive user — prevents user enumeration', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...mockUser, status: 'INATIVO' },
    ])

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1, challenge: 'valid-challenge' })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 429 when too many recent MFA code attempts (countRecentAttempts >= 3)', async () => {
    require('../../../shared/lib/mfa').MFAService.countRecentAttempts.mockResolvedValue(3)

    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1, challenge: 'valid-challenge' })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Muitas solicitações')
  })

  it('should return 200 with rotated challenge on success', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1, challenge: 'valid-challenge' })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Novo código enviado com sucesso')
    expect(data.challenge).toBe('rotated-challenge')
  })

  it('should NEVER expose the MFA code or user email in the response', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ userId: 1, challenge: 'valid-challenge' })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(data.code).toBeUndefined()
    expect(data.mfaCode).toBeUndefined()
    expect(data.email).toBeUndefined()
  })
})
