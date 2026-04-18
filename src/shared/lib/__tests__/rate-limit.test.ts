/**
 * Tests for RateLimiter
 * Tests the core rate limiting logic using customKey to bypass NextRequest dependency
 */

// Mock ioredis to prevent actual Redis connections
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    throw new Error('Redis mock - not available');
  });
});

// Mock next/server
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: jest.fn() },
}));

import { RateLimiter } from '@/shared/lib/rate-limit';

describe('RateLimiter', () => {
  describe('basic rate limiting via customKey', () => {
    it('should allow requests within the limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60 * 1000,
        max: 3,
        message: 'Too many requests',
      });

      // Use customKey to bypass NextRequest
      const r1 = await limiter.isAllowed({} as never, 'test-ip-1');
      const r2 = await limiter.isAllowed({} as never, 'test-ip-1');
      const r3 = await limiter.isAllowed({} as never, 'test-ip-1');

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(true);
    });

    it('should deny requests exceeding the limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        message: 'Rate limited!',
      });

      await limiter.isAllowed({} as never, 'test-ip-2'); // 1
      await limiter.isAllowed({} as never, 'test-ip-2'); // 2
      const result = await limiter.isAllowed({} as never, 'test-ip-2'); // 3 - denied

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Rate limited!');
    });

    it('should track different keys independently', async () => {
      const limiter = new RateLimiter({
        windowMs: 60 * 1000,
        max: 1,
        message: 'Limited',
      });

      const r1 = await limiter.isAllowed({} as never, 'key-a');
      const r2 = await limiter.isAllowed({} as never, 'key-b');

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);

      // Second call from same key should be denied
      const r3 = await limiter.isAllowed({} as never, 'key-a');
      expect(r3.allowed).toBe(false);
    });

    it('should return correct remaining count', async () => {
      const limiter = new RateLimiter({
        windowMs: 60 * 1000,
        max: 3,
        message: 'Limited',
      });

      const r1 = await limiter.isAllowed({} as never, 'remain-key');
      expect(r1.remaining).toBe(2);

      const r2 = await limiter.isAllowed({} as never, 'remain-key');
      expect(r2.remaining).toBe(1);

      const r3 = await limiter.isAllowed({} as never, 'remain-key');
      expect(r3.remaining).toBe(0);
    });
  });

  describe('window expiry', () => {
    it('should reset after window expires', async () => {
      const limiter = new RateLimiter({
        windowMs: 100,
        max: 1,
        message: 'Limited',
      });

      await limiter.isAllowed({} as never, 'expiry-key');
      const denied = await limiter.isAllowed({} as never, 'expiry-key');
      expect(denied.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const allowed = await limiter.isAllowed({} as never, 'expiry-key');
      expect(allowed.allowed).toBe(true);
    });
  });
});
