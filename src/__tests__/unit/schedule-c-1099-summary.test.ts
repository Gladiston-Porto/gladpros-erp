/**
 * Unit Tests — Schedule C / 1099 contractor summary
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    expenseCategory: { findFirst: jest.fn() },
    expense: { findMany: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { getContractor1099Summary } from '@/shared/services/scheduleCExportService'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('getContractor1099Summary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('totals contract labor payments per fornecedor instead of duplicating aggregate totals', async () => {
    mockPrisma.expenseCategory.findFirst.mockResolvedValue({ id: 11 })
    mockPrisma.expense.findMany.mockResolvedValue([
      { valor: 400, descricao: 'Contract labor', observacoes: null, fornecedor: { id: 1, nome: 'ABC Electric' } },
      { valor: 250, descricao: 'Contract labor', observacoes: null, fornecedor: { id: 1, nome: 'ABC Electric' } },
      { valor: 500, descricao: 'Contract labor', observacoes: null, fornecedor: { id: 2, nome: 'Dallas Plumbing' } },
      { valor: 700, descricao: 'Pagamento Worker: Field Contractor', observacoes: 'Payable #9 | Worker #44', fornecedor: null },
    ])

    const result = await getContractor1099Summary(1, 2026)

    expect(result).toEqual([
      expect.objectContaining({
        fornecedorId: 1,
        name: 'ABC Electric',
        totalPaid: 650,
        needs1099: true,
      }),
      expect.objectContaining({
        fornecedorId: 2,
        name: 'Dallas Plumbing',
        totalPaid: 500,
        needs1099: false,
      }),
      expect.objectContaining({
        workerId: 44,
        name: 'Field Contractor',
        totalPaid: 700,
        needs1099: true,
      }),
    ])
    expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        empresaId: 1,
        categoriaId: 11,
        OR: [{ fornecedorId: { not: null } }, { observacoes: { contains: 'Worker #' } }],
      }),
    }))
  })

  it('returns an empty summary when no contract labor category exists', async () => {
    mockPrisma.expenseCategory.findFirst.mockResolvedValue(null)

    const result = await getContractor1099Summary(1, 2026)

    expect(result).toEqual([])
    expect(mockPrisma.expense.findMany).not.toHaveBeenCalled()
  })
})
