// Authentication Types
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  confirmPassword: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  password: string
  confirmPassword: string
}

export interface MFARequest {
  code: string
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum AuthError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AuthConfig {
  jwtSecret: string
  jwtExpiresIn: string
  refreshTokenExpiresIn: string
  bcryptRounds: number
  mfaEnabled: boolean
  passwordMinLength: number
  passwordRequireSpecialChar: boolean
  passwordRequireNumber: boolean
  passwordRequireUppercase: boolean
}