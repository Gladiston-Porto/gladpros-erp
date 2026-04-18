import { useState } from 'react'
import { LoginCredentials, AuthError, UserRole } from '../types'
import { useAuth } from './useAuth'

interface UseLoginReturn {
  login: (credentials: LoginCredentials) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useLogin(): UseLoginReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login: authLogin, setError: setAuthError } = useAuth()

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    setAuthError(null)

    try {
      // This would typically call your API
      // For now, we'll simulate a login
      const response = await simulateLogin(credentials)

      if (response.success && response.tokens && response.user) {
        authLogin(response.tokens, response.user)
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      setAuthError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    login,
    isLoading,
    error
  }
}

// Temporary simulation function - replace with actual API call
async function simulateLogin(credentials: LoginCredentials) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Simple validation
  if (credentials.email === 'admin@example.com' && credentials.password === 'password') {
    return {
      success: true,
      tokens: {
        accessToken: 'fake-access-token',
        refreshToken: 'fake-refresh-token',
        expiresIn: 3600
      },
      user: {
        id: '1',
        email: credentials.email,
        name: 'Admin User',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  }

  return {
    success: false,
    error: AuthError.INVALID_CREDENTIALS
  }
}