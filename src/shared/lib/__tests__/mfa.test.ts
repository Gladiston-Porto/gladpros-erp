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
});
