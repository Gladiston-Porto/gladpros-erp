// packages/auth-core/src/types/auth.ts
import { User, UserRole } from './user';

/**
 * Authentication Types and Interfaces
 * Core types for the authentication system
 */

/**
 * Credentials required for user login
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Whether to remember the user for extended session */
  rememberMe?: boolean;
}

/**
 * JWT token pair returned after successful authentication
 */
export interface AuthTokens {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for token renewal */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * Payload structure for JWT tokens
 */
export interface JWTPayload {
  /** User ID */
  userId: number;
  /** User email */
  email: string;
  /** User role */
  role: UserRole;
  /** User permissions array */
  permissions: string[];
  /** Token version for invalidation */
  tokenVersion: number;
  /** Token issued at timestamp */
  iat?: number;
  /** Token expiration timestamp */
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

/**
 * Result of authentication operations
 */
export interface AuthResult {
  /** Whether the operation was successful */
  success: boolean;
  /** User object if authentication successful */
  user?: User;
  /** Auth tokens if authentication successful */
  tokens?: AuthTokens;
  /** Error message if operation failed */
  error?: string;
  /** Whether MFA is required */
  requiresMFA?: boolean;
  /** MFA token if MFA is required */
  mfaToken?: string;
}

export interface MFAResult {
  success: boolean;
  verified: boolean;
  error?: string;
}

/**
 * Configuration options for authentication middleware
 */
export interface AuthMiddlewareOptions {
  /** Whether authentication is required */
  requireAuth?: boolean;
  /** Specific role required */
  requiredRole?: UserRole;
  /** Array of roles that are allowed */
  requiredRoles?: UserRole[];
  /** Array of permissions required */
  requiredPermissions?: string[];
  /** Whether the route allows public access */
  allowPublic?: boolean;
}
