import { useState } from 'react'
import { RegisterData, AuthError } from '../types'

interface UseRegisterReturn {
  register: (data: RegisterData) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useRegister(): UseRegisterReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      // This would typically call your API
      // For now, we'll simulate registration
      const response = await simulateRegister(data)

      if (!response.success) {
        throw new Error(response.error || 'Registration failed')
      }

      // Registration successful - you might want to auto-login or redirect
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    register,
    isLoading,
    error
  }
}

// Temporary simulation function - replace with actual API call
async function simulateRegister(data: RegisterData) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Simple validation
  if (data.email.includes('@') && data.password.length >= 6) {
    return {
      success: true,
      message: 'Registration successful'
    }
  }

  return {
    success: false,
    error: AuthError.EMAIL_ALREADY_EXISTS
  }
}