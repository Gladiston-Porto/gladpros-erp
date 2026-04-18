// Mock the jwt module to avoid ES modules issues
jest.mock('../../../shared/lib/jwt', () => ({
  verifyAuthJWT: jest.fn()
}))

// Mock prisma
jest.mock('../../../server/db', () => ({
  prisma: {
    $queryRaw: jest.fn()
  }
}))

import { hasRole, requireRoles } from '../../../shared/lib/rbac'

describe('RBAC Service', () => {
  describe('hasRole', () => {
    it('should return true when user has the required role', () => {
      expect(hasRole('ADMIN', ['ADMIN'])).toBe(true)
      expect(hasRole('GERENTE', ['GERENTE', 'ADMIN'])).toBe(true)
      expect(hasRole('USUARIO', ['USUARIO', 'GERENTE', 'ADMIN'])).toBe(true)
    })

    it('should return false when user does not have the required role', () => {
      expect(hasRole('USUARIO', ['ADMIN'])).toBe(false)
      expect(hasRole('GERENTE', ['ADMIN'])).toBe(false)
      expect(hasRole('USUARIO', ['GERENTE'])).toBe(false)
    })

    it('should return true when user role is in allowed roles array', () => {
      expect(hasRole('FINANCEIRO', ['FINANCEIRO', 'ESTOQUE'])).toBe(true)
      expect(hasRole('CLIENTE', ['CLIENTE'])).toBe(true)
    })

    it('should return false for empty allowed roles array', () => {
      expect(hasRole('ADMIN', [])).toBe(false)
      expect(hasRole('USUARIO', [])).toBe(false)
    })
  })

  describe('requireRoles', () => {
    it('should not throw error when user has required role', () => {
      expect(() => requireRoles('ADMIN', ['ADMIN'])).not.toThrow()
      expect(() => requireRoles('GERENTE', ['GERENTE', 'ADMIN'])).not.toThrow()
    })

    it('should throw error when user does not have required role', () => {
      expect(() => requireRoles('USUARIO', ['ADMIN'])).toThrow('FORBIDDEN')
      expect(() => requireRoles('GERENTE', ['ADMIN'])).toThrow('FORBIDDEN')
    })

    it('should throw FORBIDDEN error message', () => {
      try {
        requireRoles('USUARIO', ['ADMIN'])
        fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('FORBIDDEN')
      }
    })
  })
})
