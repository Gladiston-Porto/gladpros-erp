/**
 * Tests for MFAService
 * Covers: code generation (crypto-secure), hashing, code lifecycle
 */
import crypto from 'crypto';

// Mock prisma before importing MFAService
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
    codigoMFA: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { MFAService } from '@/shared/lib/mfa';

describe('MFAService', () => {
  describe('generateCode', () => {
    it('should generate a 6-digit code', () => {
      const code = MFAService.generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate codes in valid range (100000-999999)', () => {
      for (let i = 0; i < 100; i++) {
        const code = MFAService.generateCode();
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it('should use crypto.randomInt (not Math.random)', () => {
      const spy = jest.spyOn(crypto, 'randomInt');
      MFAService.generateCode();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should generate different codes across multiple calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(MFAService.generateCode());
      }
      // With crypto-secure random, should get many unique codes
      expect(codes.size).toBeGreaterThanOrEqual(40);
    });
  });

  describe('hashCode', () => {
    it('should produce a SHA-256 hex hash', () => {
      const code = '123456';
      const hash = MFAService.hashCode(code);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes for the same input', () => {
      const hash1 = MFAService.hashCode('654321');
      const hash2 = MFAService.hashCode('654321');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different codes', () => {
      const hash1 = MFAService.hashCode('111111');
      const hash2 = MFAService.hashCode('222222');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createMFACode', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    it('should create MFA code with correct parameters', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.codigoMFA.create as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await MFAService.createMFACode({
        usuarioId: 1,
        tipoAcao: 'LOGIN' as const,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(prisma.codigoMFA.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: 1,
          tipoAcao: 'LOGIN',
          expiresAt: expect.any(Date),
          usado: false,
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
        select: { id: true },
      });
      expect(result).toEqual({ code: expect.any(String), id: 1 });
    });

    it('should set expiration to ~5 minutes from now', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.codigoMFA.create as jest.Mock).mockResolvedValue({ id: 1 });
      const before = new Date();

      await MFAService.createMFACode({ usuarioId: 1, tipoAcao: 'LOGIN' as const });

      const callArgs = (prisma.codigoMFA.create as jest.Mock).mock.calls[0][0];
      const expiresAt: Date = callArgs.data.expiresAt;
      const after = new Date();

      expect(expiresAt.getTime()).toBeGreaterThan(before.getTime() + 4 * 60 * 1000);
      expect(expiresAt.getTime()).toBeLessThan(after.getTime() + 6 * 60 * 1000);
    });
  });

  describe('verifyMFACode', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    it('should validate a correct, unexpired, unused code', async () => {
      const { prisma } = require('@/lib/prisma');
      const code = '123456';
      const hashedCode = MFAService.hashCode(code);
      (prisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        expiresAt: new Date(Date.now() + 10_000),
        usado: false,
      });
      (prisma.codigoMFA.update as jest.Mock).mockResolvedValue(undefined);

      const result = await MFAService.verifyMFACode({ usuarioId: 1, code });

      expect(result.valid).toBe(true);
      expect(result.codeId).toBe(1);
      expect(prisma.codigoMFA.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ usuarioId: 1, codigo: hashedCode }) }),
      );
    });

    it('should return invalid for an expired code', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        expiresAt: new Date(Date.now() - 10_000),
        usado: false,
      });

      const result = await MFAService.verifyMFACode({ usuarioId: 1, code: '123456' });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código expirado');
      expect(prisma.codigoMFA.update).not.toHaveBeenCalled();
    });

    it('should return invalid for an already used code', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        expiresAt: new Date(Date.now() + 10_000),
        usado: true,
      });

      const result = await MFAService.verifyMFACode({ usuarioId: 1, code: '123456' });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código já foi utilizado');
      expect(prisma.codigoMFA.update).not.toHaveBeenCalled();
    });

    it('should return invalid when code does not exist', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.codigoMFA.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await MFAService.verifyMFACode({ usuarioId: 1, code: '000000' });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código inválido');
      expect(prisma.codigoMFA.update).not.toHaveBeenCalled();
    });
  });
});
