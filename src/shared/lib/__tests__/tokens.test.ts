/**
 * Tests for tokens helper
 * Covers: generateToken, sha256Hex
 */
import { generateToken, sha256Hex } from '@/shared/lib/tokens';

describe('Tokens', () => {
  describe('generateToken', () => {
    it('should generate a hex string of expected length', () => {
      const token = generateToken(32);
      // 32 bytes = 64 hex characters
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 50; i++) {
        tokens.add(generateToken(32));
      }
      expect(tokens.size).toBe(50);
    });

    it('should respect the byte length parameter', () => {
      const t16 = generateToken(16);
      const t64 = generateToken(64);
      expect(t16.length).toBe(32); // 16 bytes = 32 hex chars
      expect(t64.length).toBe(128); // 64 bytes = 128 hex chars
    });
  });

  describe('sha256Hex', () => {
    it('should produce a 64-character hex hash', () => {
      const hash = sha256Hex('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic', () => {
      const hash1 = sha256Hex('hello');
      const hash2 = sha256Hex('hello');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = sha256Hex('input1');
      const hash2 = sha256Hex('input2');
      expect(hash1).not.toBe(hash2);
    });

    it('should match known SHA-256 output', () => {
      // SHA-256 of "test" is known
      const hash = sha256Hex('test');
      expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });
});
