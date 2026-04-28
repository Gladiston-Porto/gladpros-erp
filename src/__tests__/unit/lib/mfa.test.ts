/* eslint-disable @typescript-eslint/no-require-imports */
import { MFAService } from '../../../shared/lib/mfa'

// Mock do Prisma
jest.mock('../../../lib/prisma', () => ({
  prisma: {
    codigoMFA: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn()
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  }
}))

describe('MFA Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateCode', () => {
    it('should generate a 6-digit code', () => {
      const code = MFAService.generateCode()

      expect(code).toMatch(/^\d{6}$/)
      expect(code.length).toBe(6)
    })

    it('should generate different codes on multiple calls', () => {
      const code1 = MFAService.generateCode()
      const code2 = MFAService.generateCode()

      // There's a small chance these could be the same, but it's very unlikely
      expect(code1).not.toBe(code2)
    })
  })

  describe('hashCode', () => {
    it('should hash a code using SHA-256', () => {
      const code = '123456'
      const hash = MFAService.hashCode(code)

      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 produces 64 character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should produce consistent hashes for same input', () => {
      const code = '123456'
      const hash1 = MFAService.hashCode(code)
      const hash2 = MFAService.hashCode(code)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = MFAService.hashCode('123456')
      const hash2 = MFAService.hashCode('654321')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('createMFACode', () => {
    const mockPrisma = require('../../../lib/prisma').prisma

    it('should create MFA code with correct parameters', async () => {
      const mockCreateResult = { id: 1 };
      (mockPrisma.codigoMFA.create as jest.Mock).mockResolvedValue(mockCreateResult)

      const result = await MFAService.createMFACode({
        usuarioId: 1,
        tipoAcao: 'LOGIN' as const,
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      })

      expect(mockPrisma.codigoMFA.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: 1,
          tipoAcao: 'LOGIN',
          expiresAt: expect.any(Date),
          usado: false,
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        }),
        select: { id: true }
      })

      expect(result).toEqual({ code: expect.any(String), id: 1 })
    })

    it('should set expiration to 5 minutes from now', async () => {
      const beforeCreate = new Date();
      (mockPrisma.codigoMFA.create as jest.Mock).mockResolvedValue({ id: 1 })

      await MFAService.createMFACode({
        usuarioId: 1,
        tipoAcao: 'LOGIN' as const
      })

      const afterCreate = new Date()
      const callArgs = (mockPrisma.codigoMFA.create as jest.Mock).mock.calls[0][0]
      const expiresAt = callArgs.data.expiresAt

      expect(expiresAt.getTime()).toBeGreaterThan(beforeCreate.getTime())
      expect(expiresAt.getTime()).toBeLessThan(afterCreate.getTime() + 6 * 60 * 1000) // 6 minutes to account for test execution time
      expect(expiresAt.getTime()).toBeGreaterThan(afterCreate.getTime() + 4 * 60 * 1000) // At least 4 minutes
    })
  })

  describe('verifyMFACode', () => {
    const mockPrisma = require('../../../lib/prisma').prisma

    it('should validate correct code', async () => {
      const code = '123456'
      const hashedCode = MFAService.hashCode(code)
      const mockFindResult = {
        id: 1,
        expiresAt: new Date(Date.now() + 10000), // Not expired
        usado: false
      }
;
      (mockPrisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue(mockFindResult);
      (mockPrisma.codigoMFA.update as jest.Mock).mockResolvedValue(undefined)

      const result = await MFAService.verifyMFACode({
        usuarioId: 1,
        code: code
      })

      expect(result.valid).toBe(true)
      expect(result.codeId).toBe(1)
      expect(mockPrisma.codigoMFA.findFirst).toHaveBeenCalledWith({
        where: {
          usuarioId: 1,
          codigo: hashedCode,
          tipoAcao: 'LOGIN'
        },
        orderBy: { criadoEm: 'desc' },
        select: { id: true, expiresAt: true, usado: true }
      })
      expect(mockPrisma.$executeRaw).toHaveBeenCalled()
    })

    it('should return invalid for expired code', async () => {
      const code = '123456'
      const mockFindResult = {
        id: 1,
        expiresAt: new Date(Date.now() - 10000), // Expired
        usado: false
      }
;
      (mockPrisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue(mockFindResult)

      const result = await MFAService.verifyMFACode({
        usuarioId: 1,
        code: code
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Código expirado')
      expect(mockPrisma.codigoMFA.update).not.toHaveBeenCalled()
    })

    it('should return invalid for already used code', async () => {
      const code = '123456'
      const mockFindResult = {
        id: 1,
        expiresAt: new Date(Date.now() + 10000),
        usado: true // Already used
      }
;
      (mockPrisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue(mockFindResult)

      const result = await MFAService.verifyMFACode({
        usuarioId: 1,
        code: code
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Código já foi utilizado')
      expect(mockPrisma.codigoMFA.update).not.toHaveBeenCalled()
    })

    it('should return invalid for non-existent code', async () => {
      (mockPrisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await MFAService.verifyMFACode({
        usuarioId: 1,
        code: '123456'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Código inválido')
      expect(mockPrisma.codigoMFA.update).not.toHaveBeenCalled()
    })
  })
})
