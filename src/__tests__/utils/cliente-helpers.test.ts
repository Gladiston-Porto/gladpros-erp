jest.mock('@/lib/prisma', () => ({
  prisma: {
    serviceOrder: { groupBy: jest.fn() },
    projeto: { groupBy: jest.fn() },
    invoice: { groupBy: jest.fn() },
    cliente: { findFirst: jest.fn() },
  },
}))

jest.mock('@/shared/lib/audit', () => ({
  AuditService: {
    logAction: jest.fn(),
  },
}))

import {
  buildClienteDependencyConflictDetails,
  getClientesBlockingDependenciesMap,
  hasBlockingDependencies,
  maskDocumento,
  formatTelefone,
  formatZipcode,
  getClienteDisplayName,
  getDocLast4,
  hashDocumento,
  sanitizeClienteInput,
  calculateClienteDiff
} from '@/shared/lib/helpers/cliente'
import { prisma } from '@/lib/prisma'
import { Cliente } from '@prisma/client'
import { Cliente_tipo as TipoCliente } from '@prisma/client'

const mockPrisma = prisma as unknown as {
  serviceOrder: { groupBy: jest.Mock }
  projeto: { groupBy: jest.Mock }
  invoice: { groupBy: jest.Mock }
  cliente: { findFirst: jest.Mock }
}

describe('Cliente Helpers - Complete', () => {
  describe('maskDocumento', () => {
    it('should mask CPF correctly', () => {
      expect(maskDocumento('12345678901', 'PF')).toBe('***-**-8901')
    })

    it('should mask CNPJ correctly', () => {
      expect(maskDocumento('12345678901234', 'PJ')).toBe('**-***1234')
    })

    it('should handle empty document', () => {
      expect(maskDocumento('', 'PF')).toBe('')
    })

    it('should pad and mask short documents', () => {
      expect(maskDocumento('123', 'PF')).toBe('***-**-0123')
      expect(maskDocumento('123', 'PJ')).toBe('**-***0123')
    })
  })

  describe('formatTelefone', () => {
    it('should format 10-digit phone number', () => {
      expect(formatTelefone('1133334444')).toBe('(113) 333-4444')
    })

    it('should handle empty string', () => {
      expect(formatTelefone('')).toBe('')
    })

    it('should return original if not 10 digits', () => {
      expect(formatTelefone('11999999999')).toBe('11999999999')
      expect(formatTelefone('123')).toBe('123')
    })
  })

  describe('formatZipcode', () => {
    it('should format 9-digit zipcode (ZIP+4)', () => {
      expect(formatZipcode('012345678')).toBe('01234-5678')
    })

    it('should return 5-digit zipcode as-is', () => {
      expect(formatZipcode('01234')).toBe('01234')
    })

    it('should handle empty string', () => {
      expect(formatZipcode('')).toBe('')
    })

    it('should return original if not 5 or 9 digits', () => {
      expect(formatZipcode('01234567')).toBe('01234567')
      expect(formatZipcode('123')).toBe('123')
    })
  })

  describe('getClienteDisplayName', () => {
    it('should return nomeCompleto for PF', () => {
      const cliente = {
        tipo: 'PF' as TipoCliente,
        nomeCompleto: 'João Silva',
        nomeFantasia: null,
        razaoSocial: null
      } as Cliente

      expect(getClienteDisplayName(cliente)).toBe('João Silva')
    })

    it('should return nomeFantasia for PJ when available', () => {
      const cliente = {
        tipo: 'PJ' as TipoCliente,
        nomeCompleto: null,
        nomeFantasia: 'Empresa ABC',
        razaoSocial: 'Empresa ABC Ltda'
      } as Cliente

      expect(getClienteDisplayName(cliente)).toBe('Empresa ABC')
    })

    it('should return razaoSocial for PJ when nomeFantasia is null', () => {
      const cliente = {
        tipo: 'PJ' as TipoCliente,
        nomeCompleto: null,
        nomeFantasia: null,
        razaoSocial: 'Empresa ABC Ltda'
      } as Cliente

      expect(getClienteDisplayName(cliente)).toBe('Empresa ABC Ltda')
    })

    it('should return default message when no name available', () => {
      const clientePF = {
        tipo: 'PF' as TipoCliente,
        nomeCompleto: null,
        nomeFantasia: null,
        razaoSocial: null
      } as Cliente

      const clientePJ = {
        tipo: 'PJ' as TipoCliente,
        nomeCompleto: null,
        nomeFantasia: null,
        razaoSocial: null
      } as Cliente

      expect(getClienteDisplayName(clientePF)).toBe('Nome não informado')
      expect(getClienteDisplayName(clientePJ)).toBe('Razão social não informada')
    })
  })

  describe('getDocLast4', () => {
    it('should return last 4 digits', () => {
      expect(getDocLast4('12345678901')).toBe('8901')
    })

    it('should handle formatted document', () => {
      expect(getDocLast4('123.456.789-01')).toBe('8901')
    })

    it('should handle short document', () => {
      expect(getDocLast4('123')).toBe('123')
    })
  })

  describe('hashDocumento', () => {
    it('should create consistent hash', () => {
      const doc1 = hashDocumento('12345678901')
      const doc2 = hashDocumento('12345678901')
      expect(doc1).toBe(doc2)
    })

    it('should create different hashes for different docs', () => {
      const doc1 = hashDocumento('12345678901')
      const doc2 = hashDocumento('12345678902')
      expect(doc1).not.toBe(doc2)
    })

    it('should ignore formatting', () => {
      const doc1 = hashDocumento('12345678901')
      const doc2 = hashDocumento('123.456.789-01')
      expect(doc1).toBe(doc2)
    })
  })

  describe('sanitizeClienteInput', () => {
    it('should trim and clean input data', () => {
      const input = {
        tipo: 'PF' as const,
        nomeCompleto: '  João Silva  ',
        email: '  JOAO@EMAIL.COM  ',
        telefone: '(11) 99999-9999',
        ssn: '123.456.789-01',
        endereco: '  17671 Addison Rd  ',
        apartamentoUnidade: '  Apt 1710  ',
        observacoes: '  Observação  '
      }

      const result = sanitizeClienteInput(input)

      expect(result.nomeCompleto).toBe('João Silva')
      expect(result.email).toBe('joao@email.com')
      expect(result.telefone).toBe('11999999999')
      expect(result.ssn).toBe('12345678901')
      expect(result.endereco).toBe('17671 Addison Rd')
      expect(result.apartamentoUnidade).toBe('Apt 1710')
      expect(result.observacoes).toBe('Observação')
    })

    it('should handle null values', () => {
      const input = {
        nomeCompleto: null,
        razaoSocial: '',
        nomeFantasia: '   ',
        endereco: null,
        apartamentoUnidade: '',
        observacoes: null
      }

      const result = sanitizeClienteInput(input)

      expect(result.nomeCompleto).toBeNull()
      expect(result.razaoSocial).toBeNull()
      expect(result.nomeFantasia).toBeNull()
      expect(result.endereco).toBeNull()
      expect(result.apartamentoUnidade).toBeNull()
      expect(result.observacoes).toBeNull()
    })
  })

  describe('calculateClienteDiff', () => {
    it('should detect changes in fields', () => {
      const oldData = {
        nomeCompleto: 'João Silva',
        email: 'joao@old.com',
        telefone: '11999999999',
        docHash: 'hash123'
      }

      const newData = {
        nomeCompleto: 'João Santos',
        email: 'joao@new.com',
        telefone: '11999999999',
        docHash: 'hash456'
      }

      const diff = calculateClienteDiff(oldData, newData)

      expect(diff.nomeCompleto).toEqual({ old: 'João Silva', new: 'João Santos' })
      expect(diff.email).toEqual({ old: '[REDACTED]', new: '[REDACTED]' })
      expect(diff.telefone).toBeUndefined()
      expect(diff.documento).toEqual({ old: '[DOCUMENTO]', new: '[DOCUMENTO ALTERADO]' })
    })

    it('should return empty diff when no changes', () => {
      const data = {
        nomeCompleto: 'João Silva',
        email: 'joao@email.com',
        docHash: 'hash123'
      }

      const diff = calculateClienteDiff(data, data)
      expect(Object.keys(diff)).toHaveLength(0)
    })
  })

  describe('blocking dependencies', () => {
    beforeEach(() => {
      mockPrisma.serviceOrder.groupBy.mockReset()
      mockPrisma.projeto.groupBy.mockReset()
      mockPrisma.invoice.groupBy.mockReset()
    })

    it('maps active dependencies by cliente id', async () => {
      mockPrisma.serviceOrder.groupBy.mockResolvedValue([{ clienteId: 10, _count: { clienteId: 2 } }])
      mockPrisma.projeto.groupBy.mockResolvedValue([{ clienteId: 10, _count: { clienteId: 1 } }])
      mockPrisma.invoice.groupBy.mockResolvedValue([{ clienteId: 11, _count: { clienteId: 3 } }])

      const result = await getClientesBlockingDependenciesMap([10, 11])

      expect(result.get(10)).toEqual({
        activeServiceOrders: 2,
        activeProjetos: 1,
        activeInvoices: 0,
      })
      expect(result.get(11)).toEqual({
        activeServiceOrders: 0,
        activeProjetos: 0,
        activeInvoices: 3,
      })
    })

    it('identifies when a cliente has blocking dependencies', () => {
      expect(hasBlockingDependencies({
        activeServiceOrders: 0,
        activeProjetos: 0,
        activeInvoices: 0,
      })).toBe(false)

      expect(hasBlockingDependencies({
        activeServiceOrders: 1,
        activeProjetos: 0,
        activeInvoices: 0,
      })).toBe(true)
    })

    it('builds conflict details payload', () => {
      expect(buildClienteDependencyConflictDetails({
        activeServiceOrders: 2,
        activeProjetos: 1,
        activeInvoices: 3,
      })).toEqual({
        activeServiceOrders: 2,
        activeProjetos: 1,
        activeInvoices: 3,
      })
    })
  })
})
