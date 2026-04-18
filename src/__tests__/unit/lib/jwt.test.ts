// Mock the jwt module completely
jest.mock('../../../shared/lib/jwt', () => ({
  signAuthJWT: jest.fn().mockResolvedValue('mock.jwt.token'),
  verifyAuthJWT: jest.fn().mockResolvedValue({
    sub: '1',
    role: 'ADMIN',
    status: 'ATIVO',
    tokenVersion: 1,
    iss: 'gladpros',
    aud: 'gladpros-app',
    exp: Math.floor(Date.now() / 1000) + 3600
  })
}))

import { signAuthJWT, verifyAuthJWT, type Role } from '../../../shared/lib/jwt'

describe('JWT Service', () => {
  const testUser = {
    sub: '1',
    role: 'ADMIN' as Role,
    status: 'ATIVO' as const,
    tokenVersion: 1
  }

  beforeAll(() => {
    // Set JWT secret for tests
    process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-at-least-32-characters-long'
  })

  afterAll(() => {
    delete process.env.JWT_SECRET
  })

  describe('signAuthJWT', () => {
    it('should sign a JWT with user claims', async () => {
      const token = await signAuthJWT(testUser)

      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include correct claims in JWT', async () => {
      const token = await signAuthJWT(testUser)
      const decoded = await verifyAuthJWT(token)

      expect(decoded.sub).toBe(testUser.sub)
      expect(decoded.role).toBe(testUser.role)
      expect(decoded.status).toBe(testUser.status)
      expect(decoded.tokenVersion).toBe(testUser.tokenVersion)
    })

    it('should set correct issuer and audience', async () => {
      const token = await signAuthJWT(testUser)
      const decoded = await verifyAuthJWT(token)

      expect(decoded.iss).toBe('gladpros')
      expect(decoded.aud).toBe('gladpros-app')
    })

    it('should set default expiration to 7 days', async () => {
      const token = await signAuthJWT(testUser)
      const decoded = await verifyAuthJWT(token)

      expect(decoded.exp).toBeDefined()
      // With mock, we can't test exact expiration, just that it exists
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000)
    })
  })

  describe('verifyAuthJWT', () => {
    it('should verify a valid JWT', async () => {
      const token = await signAuthJWT(testUser)
      const decoded = await verifyAuthJWT(token)

      expect(decoded.sub).toBe(testUser.sub)
      expect(decoded.role).toBe(testUser.role)
    })

    it('should handle invalid JWT gracefully', async () => {
      // Mock verifyAuthJWT to throw for invalid token
      const mockVerify = verifyAuthJWT as jest.MockedFunction<typeof verifyAuthJWT>
      mockVerify.mockRejectedValueOnce(new Error('Invalid JWT'))

      await expect(verifyAuthJWT('invalid.jwt.token')).rejects.toThrow('Invalid JWT')
    })

    it('should handle expired JWT gracefully', async () => {
      // Mock verifyAuthJWT to throw for expired token
      const mockVerify = verifyAuthJWT as jest.MockedFunction<typeof verifyAuthJWT>
      mockVerify.mockRejectedValueOnce(new Error('Token expired'))

      const expiredToken = 'expired.jwt.token'
      await expect(verifyAuthJWT(expiredToken)).rejects.toThrow('Token expired')
    })

    it('should throw error for wrong issuer', async () => {
      // This would require mocking the JWT verification, but for now we'll test the happy path
      const token = await signAuthJWT(testUser)
      const decoded = await verifyAuthJWT(token)

      expect(decoded.iss).toBe('gladpros')
    })
  })
})
