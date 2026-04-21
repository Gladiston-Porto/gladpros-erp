const EMAIL_RATE_LIMIT = 5
const EMAIL_RATE_WINDOW_MS = 60 * 60 * 1000

// Exportado para que testes possam limpar entre execuções
export const emailRateLimitMap = new Map<number, { count: number; resetAt: number }>()

export function checkEmailRateLimit(userId: number): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now()
  const entry = emailRateLimitMap.get(userId)
  if (!entry || now >= entry.resetAt) {
    emailRateLimitMap.set(userId, { count: 1, resetAt: now + EMAIL_RATE_WINDOW_MS })
    return { allowed: true, retryAfterSecs: 0 }
  }
  if (entry.count >= EMAIL_RATE_LIMIT) {
    return { allowed: false, retryAfterSecs: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, retryAfterSecs: 0 }
}

export { EMAIL_RATE_LIMIT }
