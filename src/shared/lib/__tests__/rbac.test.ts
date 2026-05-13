/**
 * Tests for RBAC helpers (shared/lib/rbac.ts)
 * Covers: hasRole, requireRoles
 */

// Mock jose ESM dependency
jest.mock('@/shared/lib/jwt', () => ({
  verifyAuthJWT: jest.fn(),
}));

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { hasRole, requireRoles } from '@/shared/lib/rbac';

describe('RBAC Service', () => {
  describe('hasRole', () => {
    it('should return true when user has the required role', () => {
      expect(hasRole('ADMIN', ['ADMIN'])).toBe(true);
      expect(hasRole('GERENTE', ['GERENTE', 'ADMIN'])).toBe(true);
      expect(hasRole('USUARIO', ['USUARIO', 'GERENTE', 'ADMIN'])).toBe(true);
    });

    it('should return false when user does not have the required role', () => {
      expect(hasRole('USUARIO', ['ADMIN'])).toBe(false);
      expect(hasRole('GERENTE', ['ADMIN'])).toBe(false);
      expect(hasRole('USUARIO', ['GERENTE'])).toBe(false);
    });

    it('should return true when user role is in the allowed array', () => {
      expect(hasRole('FINANCEIRO', ['FINANCEIRO', 'ESTOQUE'])).toBe(true);
      expect(hasRole('CLIENTE', ['CLIENTE'])).toBe(true);
    });

    it('should return false for an empty allowed roles array', () => {
      expect(hasRole('ADMIN', [])).toBe(false);
      expect(hasRole('USUARIO', [])).toBe(false);
    });
  });

  describe('requireRoles', () => {
    it('should not throw when user has a required role', () => {
      expect(() => requireRoles('ADMIN', ['ADMIN'])).not.toThrow();
      expect(() => requireRoles('GERENTE', ['GERENTE', 'ADMIN'])).not.toThrow();
    });

    it('should throw FORBIDDEN when user lacks the required role', () => {
      expect(() => requireRoles('USUARIO', ['ADMIN'])).toThrow('FORBIDDEN');
      expect(() => requireRoles('GERENTE', ['ADMIN'])).toThrow('FORBIDDEN');
    });

    it('should throw an Error instance with message FORBIDDEN', () => {
      expect(() => requireRoles('USUARIO', ['ADMIN'])).toThrow(Error);
      try {
        requireRoles('USUARIO', ['ADMIN']);
      } catch (err) {
        expect((err as Error).message).toBe('FORBIDDEN');
      }
    });
  });
});
