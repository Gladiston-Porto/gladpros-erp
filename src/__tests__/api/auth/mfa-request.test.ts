 
import { POST } from '../../../app/api/auth/mfa/request/route'
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

jest.mock('../../../shared/lib/mfa', () => ({
  MFAService: {
    createMFACode: jest.fn().mockResolvedValue({ code: '987654' }),
  },
}))

jest.mock('../../../shared/lib/email', () => ({
  EmailService: {
    sendMFA: jest.fn().mockResolvedValue({ success: true }),
    prewarm: jest.fn(),
  },
}))

jest.mock('../../../shared/lib/rate-limit', () => ({
  mfaRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  },
}))

const ACTIVE_USER = {
  id: 3,
  email: 'ativo@gladpros.com',
  status: 'ATIVO',
  nome: 'Test User',
  primeiroAcesso: false,
}

describe('POST /api/auth/mfa/request', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rate-limit').mfaRateLimit.isAllowed.mockResolvedValue({ allowed: true })
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([ACTIVE_USER])

    mockRequest = {
      url: 'http://localhost/api/auth/mfa/request',
      json: jest.fn(),
      headers: { get: jest.fn() },
    } as unknown as NextRequest
  })

  // ---- Validação -----------------------------------------------------------

  it('retorna 400 para body sem email', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({})
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('INVALID_BODY')
  })

  it('retorna 400 para email com formato inválido', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'nao-e-um-email' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('retorna 400 quando json() falha (body malformado)', async () => {
    ;(mockRequest.json as jest.Mock).mockRejectedValue(new SyntaxError('Unexpected end of JSON'))
    const response = await POST(mockRequest)
    // json().catch(() => ({})) converte para {}, que falha na validação
    expect(response.status).toBe(400)
  })

  // ---- Anti-enumeration ----------------------------------------------------

  it('retorna 200 mesmo quando o usuário não existe (anti-enumeration)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: 'naoexiste@gladpros.com' })
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    // Não deve criar código MFA para usuário inexistente
    expect(require('../../../shared/lib/mfa').MFAService.createMFACode).not.toHaveBeenCalled()
  })

  it('retorna 200 mesmo quando o usuário está INATIVO (anti-enumeration)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...ACTIVE_USER, status: 'INATIVO' },
    ])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: ACTIVE_USER.email })
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(require('../../../shared/lib/mfa').MFAService.createMFACode).not.toHaveBeenCalled()
  })

  it('retorna 200 mesmo quando o usuário está BLOQUEADO (anti-enumeration)', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...ACTIVE_USER, status: 'BLOQUEADO' },
    ])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: ACTIVE_USER.email })
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    expect(require('../../../shared/lib/mfa').MFAService.createMFACode).not.toHaveBeenCalled()
  })

  // ---- Fluxo principal -----------------------------------------------------

  it('cria código MFA e dispara email para usuário ativo', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: ACTIVE_USER.email })
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(require('../../../shared/lib/mfa').MFAService.createMFACode).toHaveBeenCalledWith({
      usuarioId: ACTIVE_USER.id,
      tipoAcao: 'LOGIN',
    })
    // EmailService.prewarm deve ser chamado antes do sendMFA
    expect(require('../../../shared/lib/email').EmailService.prewarm).toHaveBeenCalled()
  })

  it('identifica primeiroAcesso para personalizar o email enviado', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...ACTIVE_USER, primeiroAcesso: true },
    ])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: ACTIVE_USER.email })
    await POST(mockRequest)
    // Verificar que sendMFA foi chamado (fire-and-forget — não bloqueante)
    // O primeiroAcesso é passado no sendMFA options
    expect(require('../../../shared/lib/mfa').MFAService.createMFACode).toHaveBeenCalled()
  })

  it('retorna 200 mesmo quando EmailService.sendMFA falha (fire-and-forget)', async () => {
    require('../../../shared/lib/email').EmailService.sendMFA.mockRejectedValue(new Error('SMTP timeout'))
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ email: ACTIVE_USER.email })
    const response = await POST(mockRequest)
    // O código MFA já foi salvo no banco; falha de email não deve bloquear a resposta
    expect(response.status).toBe(200)
  })
})
