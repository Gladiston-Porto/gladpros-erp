/* eslint-disable @typescript-eslint/no-require-imports */
import { GET, PATCH } from '../../../app/api/auth/me/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      headers: new Map<string, string>(),
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

const MOCK_USER = { id: '7', role: 'USUARIO', status: 'ATIVO', email: 'user@gladpros.com' }

const DB_USER_ROW = {
  id: 7,
  email: 'user@gladpros.com',
  nomeCompleto: 'Test User',
  telefone: '555-1234',
  endereco1: '123 Main St',
  endereco2: null,
  cidade: 'Dallas',
  estado: 'TX',
  zipcode: '75201',
  avatarUrl: null,
  dataNascimento: null,
  createdAt: new Date('2024-01-01'),
}

describe('GET /api/auth/me', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(MOCK_USER)
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([DB_USER_ROW])

    mockRequest = {
      url: 'http://localhost/api/auth/me',
      headers: { get: jest.fn() },
    } as unknown as NextRequest
  })

  it('retorna 401 quando não autenticado', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const response = await GET(mockRequest)
    expect(response.status).toBe(401)
  })

  it('retorna 200 com dados completos do usuário autenticado', async () => {
    const response = await GET(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.email).toBe('user@gladpros.com')
    expect(data.role).toBe('USUARIO')
    expect(data.status).toBe('ATIVO')
    expect(data.nome).toBe('Test User')
    expect(data.cidade).toBe('Dallas')
    expect(data.estado).toBe('TX')
  })

  it('retorna 404 quando usuário autenticado não existe mais no banco', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([])
    const response = await GET(mockRequest)
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('adiciona header Cache-Control: no-store na resposta autenticada', async () => {
    const response = await GET(mockRequest)
    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
  })

  it('normaliza dataNascimento (Date) para formato YYYY-MM-DD', async () => {
    require('../../../lib/prisma').prisma.$queryRaw.mockResolvedValue([
      { ...DB_USER_ROW, dataNascimento: new Date('1990-05-15T12:00:00Z') },
    ])
    const response = await GET(mockRequest)
    const data = await response.json()
    expect(data.dataNascimento).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('retorna dataNascimento null quando não definido', async () => {
    const response = await GET(mockRequest)
    const data = await response.json()
    expect(data.dataNascimento).toBeNull()
  })

  it('não retorna campos sensíveis (senhaHash, tokenVersion, pinSeguranca)', async () => {
    const response = await GET(mockRequest)
    const data = await response.json()
    expect(data.senha).toBeUndefined()
    expect(data.senhaHash).toBeUndefined()
    expect(data.tokenVersion).toBeUndefined()
    expect(data.pinSeguranca).toBeUndefined()
  })
})

describe('PATCH /api/auth/me', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(MOCK_USER)
    require('../../../lib/prisma').prisma.$executeRaw.mockResolvedValue(1)

    mockRequest = {
      url: 'http://localhost/api/auth/me',
      json: jest.fn(),
      headers: { get: jest.fn() },
    } as unknown as NextRequest
  })

  it('retorna 401 quando não autenticado', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ nomeCompleto: 'Test' })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(401)
  })

  it('retorna 400 para JSON inválido', async () => {
    ;(mockRequest.json as jest.Mock).mockRejectedValue(new SyntaxError('Unexpected token'))
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('JSON inválido')
  })

  it('retorna 400 para nomeCompleto muito curto (< 2 chars)', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ nomeCompleto: 'A' })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('retorna 400 para estado com mais de 2 caracteres', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ estado: 'TEX' })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(400)
  })

  it('retorna 200 ao atualizar perfil completo', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({
      nomeCompleto: 'Gladiston Porto',
      telefone: '214-555-9999',
      endereco1: '456 Elm St',
      cidade: 'Dallas',
      estado: 'TX',
      zipcode: '75201',
    })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled()
  })

  it('aceita atualização parcial (apenas telefone)', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ telefone: '972-555-0001' })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('aceita string vazia para limpar campo opcional (telefone)', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ telefone: '' })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(200)
  })

  it('normaliza dataNascimento no formato MM/DD/YYYY', async () => {
    ;(mockRequest.json as jest.Mock).mockResolvedValue({ dataNascimento: '05/15/1990' })
    const response = await PATCH(mockRequest)
    expect(response.status).toBe(200)
    // O $executeRaw deve ter sido chamado com a data normalizada
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled()
  })
})
