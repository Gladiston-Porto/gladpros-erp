import { ClienteService } from '@/shared/services/clienteService'

const originalFetch = global.fetch

describe('ClienteService API contract', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('normalizes paginated clientes list responses', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 1,
            tipo: 'PF',
            nomeCompletoOuRazao: 'John Doe',
            email: 'john@example.com',
            telefone: '(469) 555-0100',
            endereco: null,
            apartamentoUnidade: null,
            documentoMasked: '***-**-6789',
            ativo: true,
            criadoEm: '2026-01-10T12:00:00.000Z',
            atualizadoEm: '2026-01-11T12:00:00.000Z',
          },
        ],
        pagination: { page: 2, pageSize: 25, total: 30, totalPages: 2 },
        success: true,
      }),
    } as Response)

    const result = await ClienteService.getClientes({ page: 2, pageSize: 25, ativo: true })

    expect(result).toEqual({
      data: expect.any(Array),
      page: 2,
      pageSize: 25,
      total: 30,
      totalPages: 2,
    })
    expect(global.fetch).toHaveBeenCalledWith('/api/clientes?ativo=true&page=2&pageSize=25', { signal: undefined })
  })

  it('unwraps create responses from data envelope', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 10,
          tipo: 'PF',
          nomeCompletoOuRazao: 'John Doe',
          email: 'john@example.com',
          telefone: '(469) 555-0100',
          endereco: null,
          apartamentoUnidade: null,
          documentoMasked: '***-**-6789',
          ativo: true,
          criadoEm: '2026-01-10T12:00:00.000Z',
          atualizadoEm: '2026-01-11T12:00:00.000Z',
        },
        success: true,
      }),
    } as Response)

    const result = await ClienteService.createCliente({
      tipo: 'PF',
      nomeCompleto: 'John Doe',
      email: 'john@example.com',
      telefone: '4695550100',
      addressStreet: '17671 Addison Rd',
      addressCity: 'Dallas',
      addressState: 'TX',
      addressZip: '75287',
      tipoDocumentoPF: 'SSN',
      ssn: '123456789',
    })

    expect(result.id).toBe(10)
    expect(global.fetch).toHaveBeenCalledWith('/api/clientes', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })

  it('returns processed count for bulk operations', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { processed: 3 },
        success: true,
      }),
    } as Response)

    const result = await ClienteService.bulkClientes('deactivate', 'selected', { ids: [1, 2, 3] })

    expect(result).toEqual({ processed: 3 })
    expect(global.fetch).toHaveBeenCalledWith('/api/clientes/bulk', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })

  it('sends selected ids to PDF export', async () => {
    const blob = new Blob(['pdf'])
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      blob: async () => blob,
    } as Response)

    const result = await ClienteService.exportClientesPDF(undefined, [4, 5])

    expect(result).toBe(blob)
    expect(global.fetch).toHaveBeenCalledWith('/api/clientes/export/pdf', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ filters: undefined, selectedIds: [4, 5] }),
    }))
  })
})
