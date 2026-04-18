// packages/auth-core/src/services/jwt-service.ts
// Temporarily disabled JWT functionality - needs jsonwebtoken dependency
// import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload, AuthTokens } from '../types/auth';

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    accessTokenSecret: string,
    refreshTokenSecret: string,
    accessTokenExpiry: string = '15m',
    refreshTokenExpiry: string = '7d'
  ) {
    this.accessTokenSecret = accessTokenSecret;
    this.refreshTokenSecret = refreshTokenSecret;
    this.accessTokenExpiry = accessTokenExpiry;
    this.refreshTokenExpiry = refreshTokenExpiry;
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): AuthTokens { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Payload will be used when JWT generation is implemented
    // Temporarily throw error - needs jsonwebtoken
    throw new Error('JWT generation needs jsonwebtoken dependency');
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload | null { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // return jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      throw new Error('JWT verification needs jsonwebtoken dependency');
    } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Error will be used when JWT verification is implemented
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload | null { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // return jwt.verify(token, this.refreshTokenSecret) as RefreshTokenPayload;
      throw new Error('JWT verification needs jsonwebtoken dependency');
    } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Error will be used when JWT verification is implemented
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): AuthTokens | null {
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) return null;

    // Generate new access token with same payload
    throw new Error('JWT refresh needs jsonwebtoken dependency');
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 15 minutes default

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  }
}
