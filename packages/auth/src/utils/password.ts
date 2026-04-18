import { AuthConfig } from '../types'

/**
 * Validate password strength based on configuration
 */
export function validatePassword(
  password: string,
  config: Partial<AuthConfig> = {}
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  const {
    passwordMinLength = 8,
    passwordRequireSpecialChar = true,
    passwordRequireNumber = true,
    passwordRequireUppercase = true
  } = config

  // Check minimum length
  if (password.length < passwordMinLength) {
    errors.push(`Password must be at least ${passwordMinLength} characters long`)
  }

  // Check for uppercase letter
  if (passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Check for number
  if (passwordRequireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Check for special character
  if (passwordRequireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Check if password matches confirmation
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword
}