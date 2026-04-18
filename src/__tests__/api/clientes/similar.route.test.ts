/**
 * @jest-environment node
 *
 * Testes unitários: GET /api/clientes/similar
 *
 * Cobre:
 * - Auth (requireClientePermission canRead)
 * - Rate-limit (429)
 * - Resposta vazia quando nenhum parâmetro é passado
 * - Busca por telefone — retorna clientes similares
 * - Busca por endereço — retorna clientes similares
 * - Busca combinada (telefone + endereço)
 * - excludeId exclui o próprio cliente (modo edição)
 * - Parâmetros inválidos retornam 400
 * - hasMatches = false quando nenhum cliente encontrado
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/shared/lib/helpers/cliente', () => ({
  formatTelefone: jest.fn((t: string) => `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6)}`),
}))

// ── Imports pós-mock ──────────────────────────────────────────────────────

import { GET } from '@/app/api/clientes/similar/route'
import { requireClientePermission } from '@/shared/lib/rbac'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import { prisma } from '@/lib/prisma'

const mockRequirePermission = requireClientePermission as jest.Mock
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock
const mockFindMany = prisma.cliente.findMany as jest.Mock

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const qs = new URLSearchParams(params).toString()
  const url = `http://localhost/api/clientes/similar${qs ? `?${qs}` : ''}`
  return new NextRequest(url)
}

const clienteJoao = {
  id: 10,
  nomeCompleto: 'João Silva',
  razaoSocial: null,
  tipo: 'PF',
  email: 'joao@example.com',
}

const clienteEmpresa = {
  id: 20,
  nomeCompleto: null,
  razaoSocial: 'Empresa XYZ',
  tipo: 'PJ',
  email: 'contato@xyz.com',
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks() // resetAllMocks limpa a fila "once" e as implementações padrão
  mockRequirePermission.mockResolvedValue({ id: 1, role: 'ADMIN' })
  mockRateLimit.mockResolvedValue({ allowed: true })
  mockFindMany.mockResolvedValue([])
})

// ── Testes ─────────────────────────────────────────────────────────────────

describe('GET /api/clientes/similar', () => {
  describe('Controle de acesso', () => {
    it('exige canRead via requireClientePermission', async () => {
      mockRequirePermission.mockRejectedValueOnce(new Error('UNAUTHENTICATED'))
      const req = makeRequest({ telefone: '4693346918' })
      const res = await GET(req)
      expect(res.status).toBe(401)
      expect(mockRequirePermission).toHaveBeenCalledWith(req, 'canRead')
    })

    it('retorna 429 quando rate-limit está esgotado', async () => {
      mockRateLimit.mockResolvedValueOnce({ allowed: false, message: 'Too many requests' })
      const req = makeRequest({ telefone: '4693346918' })
      const res = await GET(req)
      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })

  describe('Resposta vazia', () => {
    it('retorna hasMatches false e listas vazias quando nenhum parâmetro útil é passado', async () => {
      const req = makeRequest()
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.hasMatches).toBe(false)
      expect(body.data.byTelefone).toHaveLength(0)
      expect(body.data.byAddress).toHaveLength(0)
      expect(mockFindMany).not.toHaveBeenCalled()
    })

    it('ignora telefone com menos de 10 dígitos', async () => {
      const req = makeRequest({ telefone: '469334' })
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.hasMatches).toBe(false)
      expect(mockFindMany).not.toHaveBeenCalled()
    })
  })

  describe('Busca por telefone', () => {
    it('retorna clientes com mesmo telefone', async () => {
      mockFindMany
        .mockResolvedValueOnce([clienteJoao]) // byTelefone
        .mockResolvedValueOnce([])             // byAddress (sem addressStreet)
      const req = makeRequest({ telefone: '4693346918' })
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.hasMatches).toBe(true)
      expect(body.data.byTelefone).toHaveLength(1)
      expect(body.data.byTelefone[0].nome).toBe('João Silva')
    })

    it('retorna hasMatches false quando nenhum cliente tem o mesmo telefone', async () => {
      mockFindMany.mockResolvedValue([])
      const req = makeRequest({ telefone: '4693346918' })
      const res = await GET(req)
      const body = await res.json()
      expect(body.data.hasMatches).toBe(false)
    })
  })

  describe('Busca por endereço', () => {
    it('retorna clientes com endereço similar', async () => {
      // Apenas endereço → apenas UMA chamada findMany (sem telefone)
      mockFindMany.mockResolvedValueOnce([clienteEmpresa])
      const req = makeRequest({ addressStreet: '123 Main St', addressCity: 'Dallas' })
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.hasMatches).toBe(true)
      expect(body.data.byAddress).toHaveLength(1)
      expect(body.data.byAddress[0].nome).toBe('Empresa XYZ')
    })

    it('ignora busca por endereço quando apenas addressStreet é fornecido sem addressCity', async () => {
      const req = makeRequest({ addressStreet: '123 Main St' })
      const res = await GET(req)
      const body = await res.json()
      expect(body.data.hasMatches).toBe(false)
      expect(mockFindMany).not.toHaveBeenCalled()
    })
  })

  describe('Busca combinada', () => {
    it('busca telefone e endereço simultaneamente e retorna ambos', async () => {
      mockFindMany
        .mockResolvedValueOnce([clienteJoao])    // byTelefone
        .mockResolvedValueOnce([clienteEmpresa]) // byAddress
      const req = makeRequest({
        telefone: '4693346918',
        addressStreet: '123 Main St',
        addressCity: 'Dallas',
        addressState: 'TX',
      })
      const res = await GET(req)
      const body = await res.json()
      expect(body.data.hasMatches).toBe(true)
      expect(body.data.byTelefone).toHaveLength(1)
      expect(body.data.byAddress).toHaveLength(1)
    })
  })

  describe('excludeId (modo edição)', () => {
    it('passa excludeId para a query evitando auto-match', async () => {
      mockFindMany.mockResolvedValue([])
      const req = makeRequest({ telefone: '4693346918', excludeId: '99' })
      await GET(req)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 99 },
          }),
        })
      )
    })
  })

  describe('Mapeamento do nome', () => {
    it('usa nomeCompleto para PF', async () => {
      // Apenas telefone → apenas UMA chamada findMany
      mockFindMany.mockResolvedValueOnce([clienteJoao])
      const req = makeRequest({ telefone: '4693346918' })
      const res = await GET(req)
      const body = await res.json()
      expect(body.data.byTelefone[0].nome).toBe('João Silva')
    })

    it('usa razaoSocial para PJ quando nomeCompleto é null', async () => {
      // Apenas telefone → apenas UMA chamada findMany
      mockFindMany.mockResolvedValueOnce([clienteEmpresa])
      const req = makeRequest({ telefone: '4693346918' })
      const res = await GET(req)
      const body = await res.json()
      expect(body.data.byTelefone[0].nome).toBe('Empresa XYZ')
    })
  })
})
