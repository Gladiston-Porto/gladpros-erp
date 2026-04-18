import {
  clienteCreateSchema,
  clienteFiltersSchema,
  clienteUpdateSchema,
} from '@/shared/lib/validations/cliente'

describe('Cliente validation rules', () => {
  it('accepts PF payload with US address and SSN', () => {
    const result = clienteCreateSchema.safeParse({
      tipo: 'PF',
      nomeCompleto: 'John Doe',
      email: 'JOHN@EXAMPLE.COM',
      telefone: '(469) 555-0100',
      tipoDocumentoPF: 'SSN',
      ssn: '123-45-6789',
      addressStreet: '17671 Addison Rd',
      addressCity: 'Dallas',
      addressState: 'tx',
      addressZip: '75287',
      addressCounty: 'Dallas County',
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.email).toBe('john@example.com')
    expect(result.data.telefone).toBe('4695550100')
    expect(result.data.addressState).toBe('TX')
  })

  it('rejects PJ payload without nome fantasia', () => {
    const result = clienteCreateSchema.safeParse({
      tipo: 'PJ',
      razaoSocial: 'GladPros LLC',
      email: 'billing@gladpros.com',
      telefone: '(469) 555-0100',
      ein: '12-3456789',
      addressStreet: '17671 Addison Rd',
      addressCity: 'Dallas',
      addressState: 'TX',
      addressZip: '75287',
    })

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error.issues.some((issue) => issue.path.join('.') === 'nomeFantasia')).toBe(true)
  })

  it('rejects invalid US phone format', () => {
    const result = clienteCreateSchema.safeParse({
      tipo: 'PF',
      nomeCompleto: 'John Doe',
      email: 'john@example.com',
      telefone: '+1 (469) 555-0100',
      addressStreet: '17671 Addison Rd',
      addressCity: 'Dallas',
      addressState: 'TX',
      addressZip: '75287',
    })

    expect(result.success).toBe(false)
  })

  it('rejects incomplete address updates', () => {
    const result = clienteUpdateSchema.safeParse({
      addressState: 'TEXAS',
    })

    expect(result.success).toBe(false)
  })

  it('parses filter defaults and boolean active flag', () => {
    const result = clienteFiltersSchema.parse({
      ativo: 'true',
      page: '2',
      pageSize: '25',
      addressState: 'tx',
    })

    expect(result.ativo).toBe(true)
    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(25)
    expect(result.addressState).toBe('tx')
  })
})
