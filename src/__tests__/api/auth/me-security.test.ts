/* eslint-disable @typescript-eslint/no-require-imports */
import { PATCH } from '../../../app/api/auth/me/security/route'
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
    $executeRaw: jest.fn().mockResolvedValue(1),
  },
}))

jest.mock('../../../shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('../../../shared/lib/password', () => ({
  PasswordService: {
    verifyPassword: jest.fn(),
    hashPassword: jest.fn().mockResolvedValue('$2b$12$hashedNewPassword'),
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
    log: jest.fn().mockResolvedValue(undefined),
    logPasswordChange: jest.fn().mockResolvedValue(undefined),
    getClientInfo: jest.fn().mockReturnValue({ ip: '127.0.0.1', userAgent: 'Jest/Test' }),
  },
}))

jest.mock('../../../lib/auth/token-service', () => ({
  revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
}))

const MOCK_USER = { id: '10', role: 'USUARIO', status: 'ATIVO', email: 'user@gladpros.com' }
const DB_ROW = { senha: '$2b$12$currentHashedPassword', email: 'user@gladpros.com' }

describe('PATCH /api/auth/me/security', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(MOCK_USER)
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([DB_ROW])
    require('../../../shared/lib/password').PasswordService.verifyPassword.mockResolvedValue(true)
    // Resetar explicitamente para garantir isolamento entre testes
    require('../../../shared/lib/security').SecurityService.isPasswordReused.mockResolvedValue(false)

    mockRequest = {
      url: 'http://localhost/api/auth/me/security',
      json: jest.fn(),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') },
    } as unknown as NextRequest
  })

  // ---- Auth ----------------------------------------------------------------

  it('retorna 401 quando não autenticado', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    ;(mockRequest.json as jest.Mock).mockResolvedValue({})
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(401)
  })

  // ---- Validação -----------------------------------------------------------

  it('retorna 400 para JSON inválido', async () => {
    ;(mockRequest.json as jest.Mock).mockRejectedValue(new SyntaxError('bad json'))
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('JSON inválido')
  })

  it('retorna 400 para action desconhecida ou ausente', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ action: 'delete-account', senhaAtual: 'Pass1!' })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('retorna 404 quando o usuário não é encontrado no banco', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-password',
      senhaAtual: 'SomePass1!',
      novaSenha: 'NewPass1!@',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(404)
  })

  it('retorna 400 quando a senha atual está incorreta', async () => {
    require('../../../shared/lib/password').PasswordService.verifyPassword.mockResolvedValue(false)
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-password',
      senhaAtual: 'WrongPass!1',
      novaSenha: 'NewPass1!@',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Senha atual incorreta')
  })

  // ---- change-password -----------------------------------------------------

  it('change-password: retorna 400 quando nova senha não atende requisitos de complexidade', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-password',
      senhaAtual: 'Current1!',
      novaSenha: 'fraca', // sem maiúscula, sem número, sem símbolo, curta
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
  })

  it('change-password: retorna 400 quando nova senha foi usada recentemente', async () => {
    require('../../../shared/lib/security').SecurityService.isPasswordReused.mockResolvedValue(true)
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-password',
      senhaAtual: 'Current1!',
      novaSenha: 'OldPass1!@',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('já foi utilizada')
  })

  it('change-password: retorna 200, revoga tokens e registra audit log', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-password',
      senhaAtual: 'Current1!',
      novaSenha: 'NewSecure1!@',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(require('../../../shared/lib/password').PasswordService.hashPassword).toHaveBeenCalledWith('NewSecure1!@')
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled()
    expect(require('../../../shared/lib/security').SecurityService.addPasswordToHistory).toHaveBeenCalled()
    expect(require('../../../lib/auth/token-service').revokeAllUserTokens).toHaveBeenCalledWith(
      10,
      'Troca de senha pelo usuário'
    )
    expect(require('../../../shared/lib/audit').AuditLogger.logPasswordChange).toHaveBeenCalled()
  })

  // ---- change-pin ----------------------------------------------------------

  it('change-pin: retorna 400 para PIN inválido (não são 4 dígitos numéricos)', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-pin',
      senhaAtual: 'Current1!',
      novoPIN: 'abcd',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
  })

  it('change-pin: retorna 400 para PIN de 3 dígitos', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-pin',
      senhaAtual: 'Current1!',
      novoPIN: '123',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
  })

  it('change-pin: retorna 200 e registra audit log ao trocar PIN', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-pin',
      senhaAtual: 'Current1!',
      novoPIN: '5678',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(require('../../../shared/lib/password').PasswordService.hashPassword).toHaveBeenCalledWith('5678')
    expect(require('../../../shared/lib/audit').AuditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SECURITY_CHANGE', status: 'SUCCESS' })
    )
  })

  // ---- change-security -----------------------------------------------------

  it('change-security: retorna 400 para pergunta muito curta (< 5 chars)', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-security',
      senhaAtual: 'Current1!',
      perguntaSecreta: 'Hi?',
      respostaSecreta: 'Bolinha',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
  })

  it('change-security: retorna 200 ao trocar pergunta e resposta de segurança', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      action: 'change-security',
      senhaAtual: 'Current1!',
      perguntaSecreta: 'Qual o nome do seu primeiro pet?',
      respostaSecreta: 'Bolinha',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    // Resposta deve ser hasheada (case-insensitive, trimmed)
    expect(require('../../../shared/lib/password').PasswordService.hashPassword).toHaveBeenCalledWith('bolinha')
    expect(require('../../../shared/lib/audit').AuditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SECURITY_CHANGE', status: 'SUCCESS' })
    )
  })
})
