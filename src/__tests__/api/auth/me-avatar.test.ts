/* eslint-disable @typescript-eslint/no-require-imports */
import { POST, DELETE } from '../../../app/api/auth/me/avatar/route'
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
    $executeRaw: jest.fn().mockResolvedValue(1),
  },
}))

jest.mock('../../../shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}))

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const MOCK_USER = { id: '7', role: 'USUARIO', status: 'ATIVO', email: 'user@gladpros.com' }

// Magic bytes válidos por tipo
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF, 0x00],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
}

/**
 * Cria um mock de File com controle total sobre type, size e arrayBuffer.
 * Não aloca memória real — ideal para testes unitários.
 */
function createMockFile(opts: {
  type: string
  size?: number
  validMagicBytes?: boolean
}): File {
  const { type, size = 1024, validMagicBytes = true } = opts
  const bytes = validMagicBytes && MAGIC_BYTES[type]
    ? new Uint8Array(MAGIC_BYTES[type])
    : new Uint8Array([0x00, 0x01, 0x02, 0x03]) // bytes inválidos

  return {
    type,
    size,
    name: 'test-file',
    arrayBuffer: jest.fn().mockResolvedValue(bytes.buffer),
  } as unknown as File
}

/**
 * Cria um NextRequest mock com formData contendo o arquivo informado.
 */
function makeRequest(file: File | null): NextRequest {
  const mockFormData = { get: jest.fn().mockReturnValue(file) }
  return {
    url: 'http://localhost/api/auth/me/avatar',
    headers: { get: jest.fn() },
    formData: jest.fn().mockResolvedValue(mockFormData),
  } as unknown as NextRequest
}

describe('POST /api/auth/me/avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(MOCK_USER)
  })

  // ---- Auth ----------------------------------------------------------------

  it('retorna 401 quando não autenticado', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const response = await POST(makeRequest(createMockFile({ type: 'image/jpeg' })))
    expect(response.status).toBe(401)
  })

  // ---- Validação de arquivo ------------------------------------------------

  it('retorna 400 quando nenhum arquivo é enviado', async () => {
    const response = await POST(makeRequest(null))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Nenhum arquivo enviado')
    expect(data.success).toBe(false)
  })

  it('retorna 400 para MIME type não suportado (application/pdf)', async () => {
    const file = createMockFile({ type: 'application/pdf', validMagicBytes: false })
    const response = await POST(makeRequest(file))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Formato não suportado')
  })

  it('retorna 400 para MIME type não suportado (image/bmp)', async () => {
    const file = createMockFile({ type: 'image/bmp', validMagicBytes: false })
    const response = await POST(makeRequest(file))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Formato não suportado')
  })

  it('retorna 400 para arquivo maior que 5MB', async () => {
    const bigFile = createMockFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1, validMagicBytes: true })
    const response = await POST(makeRequest(bigFile))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('muito grande')
  })

  it('retorna 400 quando magic bytes não correspondem ao MIME type declarado (executável disfarçado)', async () => {
    // MIME diz image/jpeg mas bytes não são JPEG
    const file = createMockFile({ type: 'image/jpeg', validMagicBytes: false })
    const response = await POST(makeRequest(file))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('inválido')
  })

  // ---- Upload bem-sucedido -------------------------------------------------

  it('retorna 200 com avatarUrl para upload JPEG válido', async () => {
    const file = createMockFile({ type: 'image/jpeg', size: 512 })
    const response = await POST(makeRequest(file))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.avatarUrl).toMatch(/^\/api\/uploads\/avatars\/avatar-7-\d+\.jpg$/)
  })

  it('retorna 200 com avatarUrl para upload PNG válido', async () => {
    const file = createMockFile({ type: 'image/png', size: 1024 })
    const response = await POST(makeRequest(file))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.avatarUrl).toMatch(/\.png$/)
  })

  it('retorna 200 para WebP válido', async () => {
    const file = createMockFile({ type: 'image/webp', size: 800 })
    const response = await POST(makeRequest(file))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.avatarUrl).toMatch(/\.webp$/)
  })

  it('salva o arquivo no sistema de arquivos via writeFile', async () => {
    const file = createMockFile({ type: 'image/jpeg', size: 512 })
    await POST(makeRequest(file))
    expect(require('fs/promises').writeFile).toHaveBeenCalled()
  })

  it('cria o diretório de avatares se não existir', async () => {
    const file = createMockFile({ type: 'image/jpeg', size: 512 })
    await POST(makeRequest(file))
    expect(require('fs/promises').mkdir).toHaveBeenCalledWith(
      expect.stringContaining('avatars'),
      { recursive: true }
    )
  })

  it('atualiza avatarUrl no banco e revalida o cache do dashboard', async () => {
    const file = createMockFile({ type: 'image/jpeg', size: 512 })
    await POST(makeRequest(file))
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled()
    expect(require('next/cache').revalidatePath).toHaveBeenCalledWith('/(dashboard)', 'layout')
  })

  it('aceita arquivo com exatamente 5MB (limite máximo)', async () => {
    const file = createMockFile({ type: 'image/jpeg', size: 5 * 1024 * 1024, validMagicBytes: true })
    const response = await POST(makeRequest(file))
    expect(response.status).toBe(200)
  })
})

describe('DELETE /api/auth/me/avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('../../../shared/lib/rbac').requireUser.mockResolvedValue(MOCK_USER)
  })

  it('retorna 401 quando não autenticado', async () => {
    require('../../../shared/lib/rbac').requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'))
    const mockRequest = {
      url: 'http://localhost/api/auth/me/avatar',
      headers: { get: jest.fn() },
    } as unknown as NextRequest
    const response = await DELETE(mockRequest)
    expect(response.status).toBe(401)
  })

  it('retorna 200 e remove o avatarUrl (define NULL no banco)', async () => {
    const mockRequest = {
      url: 'http://localhost/api/auth/me/avatar',
      headers: { get: jest.fn() },
    } as unknown as NextRequest
    const response = await DELETE(mockRequest)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(require('../../../lib/prisma').prisma.$executeRaw).toHaveBeenCalled()
  })
})
