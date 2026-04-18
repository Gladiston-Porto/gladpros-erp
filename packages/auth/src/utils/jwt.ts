import jwt from 'jsonwebtoken'
import { User, AuthTokens } from '../types'

/**
 * Generate JWT access token
 */
export function generateToken(
  payload: Partial<User>,
  secret: string,
  expiresIn: string | number = '1h'
): string {
  return jwt.sign(payload, secret, { expiresIn })
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string, secret: string): User | null {
  try {
    const decoded = jwt.verify(token, secret) as User
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  payload: Partial<User>,
  secret: string,
  expiresIn: string | number = '7d'
): string {
  return jwt.sign(payload, secret, { expiresIn })
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(
  user: User,
  jwtSecret: string,
  refreshSecret: string,
  accessExpiresIn: string = '1h',
  refreshExpiresIn: string = '7d'
): AuthTokens {
  const accessToken = generateToken(user, jwtSecret, accessExpiresIn)
  const refreshToken = generateRefreshToken(user, refreshSecret, refreshExpiresIn)

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600 // 1 hour in seconds
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7) // Remove 'Bearer ' prefix
}