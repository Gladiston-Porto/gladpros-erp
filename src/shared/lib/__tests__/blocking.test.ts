/**
 * Tests for BlockingService
 * Covers: thresholds, block/unblock logic
 */

// Mock prisma
const mockExecuteRaw = jest.fn().mockResolvedValue(1);
const mockQueryRaw = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

import { BlockingService } from '@/shared/lib/blocking';

describe('BlockingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordFailedAttempt', () => {
    it('should record a failed attempt via SQL', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ count: 1 }]); // getFailedAttemptCount
      
      await BlockingService.recordFailedAttempt({
        userId: 1,
        email: 'test@gladpros.com',
        ip: '127.0.0.1',
        userAgent: 'jest-test',
        motivo: 'INVALID_PASSWORD',
      });

      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should block user after 5 failed attempts', async () => {
      // Mock 5 failed attempts count
      mockQueryRaw.mockResolvedValueOnce([{ count: 5 }]);
      
      await BlockingService.recordFailedAttempt({
        userId: 1,
        email: 'test@gladpros.com',
      });

      // Should have called executeRaw twice: once for INSERT, once for UPDATE (block)
      expect(mockExecuteRaw).toHaveBeenCalledTimes(2);
    });

    it('should NOT block user with fewer than 5 failed attempts', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ count: 3 }]);
      
      await BlockingService.recordFailedAttempt({
        userId: 1,
        email: 'test@gladpros.com',
      });

      // Should have called executeRaw once (INSERT only, no block UPDATE)
      expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkUserBlock', () => {
    it('should return blocked: false if user is not blocked', async () => {
      mockQueryRaw.mockResolvedValueOnce([{
        bloqueado: false,
        bloqueadoEm: null,
        pinSeguranca: null,
        perguntaSecreta: null,
      }]);

      const result = await BlockingService.checkUserBlock(1);
      expect(result.blocked).toBe(false);
    });

    it('should return blocked: true with unlock methods for blocked user', async () => {
      const now = new Date();
      mockQueryRaw
        .mockResolvedValueOnce([{
          bloqueado: true,
          bloqueadoEm: now,
          pinSeguranca: '$2b$12$hashedpin',
          perguntaSecreta: 'Qual seu pet?',
        }])
        .mockResolvedValueOnce([{ count: 20 }]); // 20 attempts = permanent block

      const result = await BlockingService.checkUserBlock(1);
      expect(result.blocked).toBe(true);
      expect(result.requiresPinUnlock).toBe(true);
      expect(result.requiresSecurityQuestion).toBe(true);
    });

    it('should auto-unblock when time-based block has expired', async () => {
      const pastTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      mockQueryRaw
        .mockResolvedValueOnce([{
          bloqueado: true,
          bloqueadoEm: pastTime,
          pinSeguranca: null,
          perguntaSecreta: null,
        }])
        .mockResolvedValueOnce([{ count: 5 }]); // 5 attempts = 1 min block (already expired)

      const result = await BlockingService.checkUserBlock(1);
      expect(result.blocked).toBe(false);
      // Should have called UPDATE to unblock
      expect(mockExecuteRaw).toHaveBeenCalled();
    });
  });

  describe('clearFailedAttempts', () => {
    it('should unblock the user', async () => {
      await BlockingService.clearFailedAttempts(1);
      expect(mockExecuteRaw).toHaveBeenCalled();
    });
  });
});
