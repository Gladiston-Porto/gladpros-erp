/**
 * Unit Tests — ownerCompensationService S-Corp / LLC business rules
 *
 * These tests validate the IRS-critical rules defined in AGENTS.md §13:
 *   LLC_DEFAULT  → only OWNER_DRAW
 *   S_CORP       → SALARY or DISTRIBUTION (no OWNER_DRAW)
 *   S_CORP + DISTRIBUTION → must have SALARY in same year first
 *   Warning      → salary YTD < 30% of total compensation
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    worker: { findUnique: jest.fn() },
    empresa: { findUniqueOrThrow: jest.fn() },
    ownerCompensation: {
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
const mockPrisma = prisma as jest.Mocked<typeof prisma>

import { createCompensation } from '@/shared/services/ownerCompensationService'

const BASE_INPUT = {
  empresaId: 1,
  workerId: 10,
  tipo: 'OWNER_DRAW' as const,
  valor: 5000,
  data: new Date('2024-06-01'),
  criadoPor: 1,
}

const mockOwnerOperator = { classification: 'OWNER_OPERATOR' }
const mockContractor = { classification: 'SUBCONTRACTOR' }

function mockCreatedCompensation(tipo: string) {
  mockPrisma.ownerCompensation.create.mockResolvedValue({
    id: 1,
    tipo,
    valor: BASE_INPUT.valor,
    worker: { id: 10, name: 'John' },
    bankAccount: null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.auditLog.create.mockResolvedValue({})
})

// ── Worker Classification ────────────────────────────────────────────────────

describe('Worker classification guard', () => {
  it('blocks compensation for non-OWNER_OPERATOR workers', async () => {
    mockPrisma.worker.findUnique.mockResolvedValue(mockContractor)

    const result = await createCompensation(BASE_INPUT)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('NOT_OWNER')
  })

  it('returns NOT_FOUND when worker does not exist', async () => {
    mockPrisma.worker.findUnique.mockResolvedValue(null)

    const result = await createCompensation(BASE_INPUT)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('WORKER_NOT_FOUND')
  })
})

// ── LLC_DEFAULT Regime ───────────────────────────────────────────────────────

describe('LLC_DEFAULT regime', () => {
  beforeEach(() => {
    mockPrisma.worker.findUnique.mockResolvedValue(mockOwnerOperator)
    mockPrisma.empresa.findUniqueOrThrow.mockResolvedValue({ tipoTributacao: 'LLC_DEFAULT' })
  })

  it('allows OWNER_DRAW', async () => {
    mockCreatedCompensation('OWNER_DRAW')

    const result = await createCompensation({ ...BASE_INPUT, tipo: 'OWNER_DRAW' })

    expect(result.success).toBe(true)
  })

  it('blocks SALARY in LLC regime', async () => {
    const result = await createCompensation({ ...BASE_INPUT, tipo: 'SALARY' })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('LLC_INVALID_TYPE')
    expect(result.error?.message).toContain('LLC')
  })

  it('blocks DISTRIBUTION in LLC regime', async () => {
    const result = await createCompensation({ ...BASE_INPUT, tipo: 'DISTRIBUTION' })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('LLC_INVALID_TYPE')
  })
})

// ── S_CORP Regime ────────────────────────────────────────────────────────────

describe('S_CORP regime', () => {
  beforeEach(() => {
    mockPrisma.worker.findUnique.mockResolvedValue(mockOwnerOperator)
    mockPrisma.empresa.findUniqueOrThrow.mockResolvedValue({ tipoTributacao: 'S_CORP' })
  })

  it('blocks OWNER_DRAW in S-Corp regime', async () => {
    const result = await createCompensation({ ...BASE_INPUT, tipo: 'OWNER_DRAW' })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('SCORP_NO_DRAW')
    expect(result.error?.message).toContain('S-Corp')
  })

  it('allows SALARY in S-Corp regime', async () => {
    mockCreatedCompensation('SALARY')
    // getCompensationWarnings also calls empresa.findUniqueOrThrow
    mockPrisma.empresa.findUniqueOrThrow
      .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })  // validateCompensation
      .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })  // getCompensationWarnings
    mockPrisma.ownerCompensation.aggregate
      .mockResolvedValueOnce({ _sum: { valor: null } })  // salary aggregate
      .mockResolvedValueOnce({ _sum: { valor: null } })  // distribution aggregate

    const result = await createCompensation({ ...BASE_INPUT, tipo: 'SALARY' })

    expect(result.success).toBe(true)
  })

  describe('DISTRIBUTION requires SALARY first (IRS blocking rule)', () => {
    it('blocks DISTRIBUTION when salary count is 0 in current year', async () => {
      mockPrisma.ownerCompensation.count.mockResolvedValue(0)  // no salaries

      const result = await createCompensation({ ...BASE_INPUT, tipo: 'DISTRIBUTION' })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('SCORP_SALARY_REQUIRED')
      expect(result.error?.message).toContain('IRS')
    })

    it('allows DISTRIBUTION when at least one SALARY exists in current year', async () => {
      mockCreatedCompensation('DISTRIBUTION')
      mockPrisma.ownerCompensation.count.mockResolvedValue(2)  // 2 salaries in year
      // getCompensationWarnings calls empresa again
      mockPrisma.empresa.findUniqueOrThrow
        .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })
        .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })
      mockPrisma.ownerCompensation.aggregate
        .mockResolvedValueOnce({ _sum: { valor: 30000 } })  // salary YTD
        .mockResolvedValueOnce({ _sum: { valor: 5000 } })   // distribution YTD

      const result = await createCompensation({ ...BASE_INPUT, tipo: 'DISTRIBUTION' })

      expect(result.success).toBe(true)
    })
  })

  describe('Low salary ratio warning', () => {
    it('emits LOW_SALARY_RATIO warning when salary < 30% of total compensation', async () => {
      mockCreatedCompensation('DISTRIBUTION')
      mockPrisma.ownerCompensation.count.mockResolvedValue(1)  // salary exists
      mockPrisma.empresa.findUniqueOrThrow
        .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })   // validate
        .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })   // warnings
      // salary YTD = 5000, distribution = 45000 → salary is 10%
      mockPrisma.ownerCompensation.aggregate
        .mockResolvedValueOnce({ _sum: { valor: 5000 } })    // salary
        .mockResolvedValueOnce({ _sum: { valor: 45000 } })   // distribution

      const result = await createCompensation({ ...BASE_INPUT, tipo: 'DISTRIBUTION', valor: 5000 })

      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'LOW_SALARY_RATIO', severity: 'warning' })
      )
    })

    it('does NOT warn when salary >= 30% of total compensation', async () => {
      mockCreatedCompensation('DISTRIBUTION')
      mockPrisma.ownerCompensation.count.mockResolvedValue(1)
      mockPrisma.empresa.findUniqueOrThrow
        .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })
        .mockResolvedValueOnce({ tipoTributacao: 'S_CORP' })
      // salary = 30000, distribution = 70000 → salary = 30%
      mockPrisma.ownerCompensation.aggregate
        .mockResolvedValueOnce({ _sum: { valor: 30000 } })
        .mockResolvedValueOnce({ _sum: { valor: 65000 } })

      const result = await createCompensation({ ...BASE_INPUT, tipo: 'DISTRIBUTION', valor: 5000 })

      expect(result.success).toBe(true)
      if (!result.success) return
      const lowSalaryWarnings = result.warnings.filter(w => w.code === 'LOW_SALARY_RATIO')
      expect(lowSalaryWarnings).toHaveLength(0)
    })
  })
})

// ── AuditLog ─────────────────────────────────────────────────────────────────

describe('AuditLog creation', () => {
  it('creates AuditLog when compensation is created successfully', async () => {
    mockPrisma.worker.findUnique.mockResolvedValue(mockOwnerOperator)
    mockPrisma.empresa.findUniqueOrThrow
      .mockResolvedValueOnce({ tipoTributacao: 'LLC_DEFAULT' })
      .mockResolvedValueOnce({ tipoTributacao: 'LLC_DEFAULT' })
    mockCreatedCompensation('OWNER_DRAW')

    await createCompensation(BASE_INPUT)

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entidade: 'OwnerCompensation',
          acao: 'CREATE',
        }),
      })
    )
  })

  it('does NOT create AuditLog when validation fails', async () => {
    mockPrisma.worker.findUnique.mockResolvedValue(mockContractor)  // validation fails

    await createCompensation(BASE_INPUT)

    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled()
  })
})
