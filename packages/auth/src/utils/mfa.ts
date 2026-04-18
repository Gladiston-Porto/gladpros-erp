/**
 * Generate a 6-digit MFA code
 */
export function generateMFA(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Verify MFA code (simple implementation - in production use proper TOTP)
 */
export function verifyMFA(inputCode: string, expectedCode: string): boolean {
  return inputCode === expectedCode
}

/**
 * Generate backup codes for MFA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    codes.push(generateMFA())
  }

  return codes
}