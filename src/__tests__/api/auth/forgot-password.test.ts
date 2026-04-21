/* eslint-disable @typescript-eslint/no-require-imports */
import { POST } from '../../../app/api/auth/forgot-password/route'
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
    passwordResetToken: { create: jest.fn() },
  },
}))

jest.mock('../../../shared/lib/tokens', () => ({
  generateToken: jest.fn().mockReturnValue('raw-token-abc123'),
  sha256Hex: jest.fn().mockReturnValue('hashed-token-abc123'),
}))

jest.mock('../../../shared/lib/email', () => ({
  EmailService: {
    prewarm: jest.fn(),
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
  },
}))

jest.mock('../../../shared/lib/rate-limit', () => ({
  resetPasswordRateLimit: { isAllowed: jest.fn() },
}))

describe('POST /api/auth/forgot-password', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rate-limit').resetPasswordRateLimit.isAllowed.mockResolvedValue({ allowed: true })
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    require('../../../lib/prisma').prisma.passwordResetToken.create.mockResolvedValue({})

    mockRequest = {
      url: 'http://localhost/api/auth/forgot-password',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue('localhost') },
    } as unknown as NextRequest
  })

  it('retorna 429 quando rate limit atingido', async () => {
    require('../../../shared/lib/rate-limit').resetPasswordRateLimit.isAllowed.mockResolvedValue({
      allowed: false,
      message: 'Muitas tentativas',
    })
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'test@test.com' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(429)
  })

  it('retorna 422 para email inválido', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'nao-e-email' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(422)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('retorna 422 para body vazio', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({})
    const response = await POST(mockRequest)
    expect(response.status).toBe(422)
  })

  it('retorna 200 quando usuário não existe (segurança: não revelar existência)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'inexistente@gladpros.com' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    // Não deve criar token quando usuário não existe
    expect(require('../../../lib/prisma').prisma.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it('retorna 200 e envia email quando usuário existe', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { id: 1, email: 'user@gladpros.com' },
    ])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'user@gladpros.com' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(require('../../../lib/prisma').prisma.passwordResetToken.create).toHaveBeenCalled()
    expect(require('../../../shared/lib/email').EmailService.sendPasswordReset).toHaveBeenCalled()
  })

  it('retorna 200 mesmo quando envio de email falha', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { id: 2, email: 'user2@gladpros.com' },
    ])
    require('../../../shared/lib/email').EmailService.sendPasswordReset.mockRejectedValue(
      new Error('SMTP timeout')
    )
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'user2@gladpros.com' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
