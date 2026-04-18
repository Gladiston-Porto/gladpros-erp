/**
 * @jest-environment node
 *
 * Testes unitários: POST /api/clientes/export/pdf
 *
 * Cobre:
 * - Content-Type application/pdf na resposta
 * - Autenticação (canRead)
 * - Rate-limit (429)
 * - Validação de body inválido (422)
 * - AuditService disparado após geração
 * - Filtro por selectedIds passado para o gerador de PDF
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

jest.mock('@/shared/lib/services/report-pdf-html', () => ({
  generateReportPDFFromHTML: jest.fn(),
}))

jest.mock('@/shared/lib/audit', () => ({
  AuditService: {
    logAction: jest.fn().mockResolvedValue(undefined),
  },
}))

// ── Imports pós-mock ──────────────────────────────────────────────────────

import { POST } from '@/app/api/clientes/export/pdf/route'
import { requireClientePermission } from '@/shared/lib/rbac'
import { apiRateLimit } from '@/shared/lib/rate-limit'
import { generateReportPDFFromHTML } from '@/shared/lib/services/report-pdf-html'
import { AuditService } from '@/shared/lib/audit'

const mockRequirePermission = requireClientePermission as jest.Mock
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock
const mockGeneratePDF = generateReportPDFFromHTML as jest.Mock
const mockAudit = AuditService.logAction as jest.Mock

const MOCK_USER = { id: 1, role: 'ADMIN', empresaId: 1 }
const MOCK_PDF_BUFFER = Buffer.from('%PDF-1.4 fake-pdf-content')

// ── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/clientes/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Testes ────────────────────────────────────────────────────────────────

describe('POST /api/clientes/export/pdf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(MOCK_USER)
    mockRateLimit.mockResolvedValue({ allowed: true })
    mockGeneratePDF.mockResolvedValue(MOCK_PDF_BUFFER)
  })

  it('retorna Content-Type application/pdf em resposta de sucesso', async () => {
    const req = makeRequest({ filename: 'relatorio-clientes' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('relatorio-clientes.pdf')
  })

  it('retorna 429 quando rate-limit está esgotado', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, message: 'Muitas requisições' })

    const req = makeRequest()
    const res = await POST(req)

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(mockRequirePermission).not.toHaveBeenCalled()
  })

  it('retorna 422 quando body contém selectedIds inválidos', async () => {
    const req = makeRequest({ selectedIds: ['nao-eh-numero'] })
    const res = await POST(req)

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('dispara AuditService após gerar o PDF', async () => {
    const req = makeRequest({ selectedIds: [10, 20] })
    await POST(req)

    // Fire-and-forget — esperamos que tenha sido chamado (pode ser async)
    await new Promise((r) => setTimeout(r, 20))
    expect(mockAudit).toHaveBeenCalledWith(
      MOCK_USER.id,
      'Cliente',
      0,
      'EXPORT_PDF',
      expect.objectContaining({ selectedIds: [10, 20] })
    )
  })

  it('passa selectedIds para o gerador de PDF via queryString', async () => {
    const req = makeRequest({ selectedIds: [5, 7] })
    await POST(req)

    expect(mockGeneratePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        printPath: '/reports/clients',
        queryString: expect.stringContaining('selectedIds=5%2C7'),
      })
    )
  })

  it('sanitiza o nome do arquivo removendo caracteres especiais', async () => {
    const req = makeRequest({ filename: '../etc/passwd!!' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const disposition = res.headers.get('Content-Disposition') ?? ''
    // Não deve conter / ou . de path traversal
    expect(disposition).not.toContain('/')
    expect(disposition).not.toContain('..')
  })

  it('usa "clientes" como nome padrão quando filename não é fornecido', async () => {
    const req = makeRequest()
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toContain('clientes.pdf')
  })
})
