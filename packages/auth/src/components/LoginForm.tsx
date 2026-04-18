import React, { useState } from 'react'
import { useLogin } from '../hooks/useLogin'
import { LoginCredentials } from '../types'

interface LoginFormProps {
  onSuccess?: () => void
  onForgotPassword?: () => void
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  })

  const { login, isLoading, error } = useLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await login(credentials)
      onSuccess?.()
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const handleChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={credentials.email}
            onChange={handleChange('email')}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleChange('password')}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {onForgotPassword && (
          <button
            type="button"
            className="w-full text-blue-600 hover:text-blue-800 text-sm"
            onClick={onForgotPassword}
          >
            Forgot password?
          </button>
        )}
      </form>
    </div>
  )
}