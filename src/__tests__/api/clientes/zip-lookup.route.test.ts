/**
 * @jest-environment node
 *
 * Testes unitários: GET /api/clientes/zip-lookup
 *
 * Cobre:
 * - Rate-limit (429)
 * - Auth (requireClientePermission canRead)
 * - ZIP válido encontrado → retorna city/state
 * - ZIP não encontrado → retorna data: null
 * - ZIP inválido (menos de 5 dígitos) → lookupZip retorna null
 * - ZIP+4 (formato 75201-1234) → normalizado e retorna resultado
 * - Sem parâmetro zip → lookupZip chamado com string vazia → retorna null
 */

import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/shared/lib/rbac', () => ({
  requireClientePermission: jest.fn(),
}))

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  },
}))

jest.mock('@/lib/validation/zip-lookup', () => ({
  lookupZip: jest.fn(),
}))

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}))

// ── Imports pós-mock ──────────────────────────────────────────────────────

import { GET } from '@/app/api/clientes/zip-lookup/route'
import { requireClientePermission } from '@/shared/lib/rbac'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import { lookupZip } from '@/lib/validation/zip-lookup'

const mockRequirePermission = requireClientePermission as jest.Mock
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock
const mockLookupZip = lookupZip as jest.Mock

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(zip?: string): NextRequest {
  const url = zip
    ? `http://localhost/api/clientes/zip-lookup?zip=${zip}`
    : 'http://localhost/api/clientes/zip-lookup'
  return new NextRequest(url)
}

const dallasTX = { city: 'Dallas', state: 'TX' }

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks()
  mockRateLimit.mockResolvedValue({ allowed: true })
  mockRequirePermission.mockResolvedValue({ id: 1, role: 'ADMIN' })
  mockLookupZip.mockResolvedValue(null)
})

// ── Testes ─────────────────────────────────────────────────────────────────

describe('GET /api/clientes/zip-lookup', () => {
  describe('Rate limit', () => {
    it('retorna 429 quando rate limit é excedido', async () => {
      mockRateLimit.mockResolvedValueOnce({ allowed: false, message: 'Too many requests' })
      const req = makeRequest('75201')
      const res = await GET(req)
      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Rate limit exceeded')
      expect(mockRequirePermission).not.toHaveBeenCalled()
      expect(mockLookupZip).not.toHaveBeenCalled()
    })
  })

  describe('Controle de acesso', () => {
    it('exige canRead via requireClientePermission', async () => {
      mockRequirePermission.mockRejectedValueOnce(new Error('UNAUTHENTICATED'))
      const req = makeRequest('75201')
      await expect(GET(req)).rejects.toThrow('UNAUTHENTICATED')
      expect(mockRequirePermission).toHaveBeenCalledWith(req, 'canRead')
    })

    it('exige permissão FORBIDDEN quando role não tem acesso', async () => {
      mockRequirePermission.mockRejectedValueOnce(new Error('FORBIDDEN'))
      const req = makeRequest('75201')
      await expect(GET(req)).rejects.toThrow('FORBIDDEN')
    })
  })

  describe('ZIP encontrado', () => {
    it('retorna city e state quando ZIP é válido', async () => {
      mockLookupZip.mockResolvedValueOnce(dallasTX)
      const req = makeRequest('75201')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual({ city: 'Dallas', state: 'TX' })
      expect(mockLookupZip).toHaveBeenCalledWith('75201')
    })

    it('repassa o zip exatamente para lookupZip (normalização é responsabilidade do helper)', async () => {
      mockLookupZip.mockResolvedValueOnce(dallasTX)
      const req = makeRequest('75201-1234')
      await GET(req)
      expect(mockLookupZip).toHaveBeenCalledWith('75201-1234')
    })
  })

  describe('ZIP não encontrado', () => {
    it('retorna data: null quando ZIP não existe', async () => {
      mockLookupZip.mockResolvedValueOnce(null)
      const req = makeRequest('00000')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toBeNull()
    })

    it('retorna data: null quando ZIP tem menos de 5 dígitos', async () => {
      mockLookupZip.mockResolvedValueOnce(null)
      const req = makeRequest('123')
      const res = await GET(req)
      const body = await res.json()
      expect(body.data).toBeNull()
    })

    it('retorna data: null quando parâmetro zip não é enviado', async () => {
      mockLookupZip.mockResolvedValueOnce(null)
      const req = makeRequest()
      const res = await GET(req)
      const body = await res.json()
      expect(body.data).toBeNull()
      expect(mockLookupZip).toHaveBeenCalledWith('')
    })
  })

  describe('Formato de resposta', () => {
    it('sempre retorna success: true no payload (erro de rede é responsabilidade do lookupZip)', async () => {
      mockLookupZip.mockResolvedValueOnce(dallasTX)
      const req = makeRequest('75201')
      const res = await GET(req)
      const body = await res.json()
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('data')
    })
  })
})
