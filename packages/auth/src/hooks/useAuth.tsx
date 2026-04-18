import { useContext, createContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthState, AuthTokens } from '../types'

interface AuthContextType extends AuthState {
  login: (tokens: AuthTokens, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('auth_token')
        const userStr = localStorage.getItem('auth_user')

        if (token && userStr) {
          const user = JSON.parse(userStr)
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setAuthState(prev => ({ ...prev, isLoading: false }))
      }
    }

    checkAuth()
  }, [])

  const login = (tokens: AuthTokens, user: User) => {
    localStorage.setItem('auth_token', tokens.accessToken)
    localStorage.setItem('auth_refresh_token', tokens.refreshToken)
    localStorage.setItem('auth_user', JSON.stringify(user))

    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null
    })
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_refresh_token')
    localStorage.removeItem('auth_user')

    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
  }

  const updateUser = (userUpdate: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userUpdate }
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))

      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }))
    }
  }

  const setError = (error: string | null) => {
    setAuthState(prev => ({ ...prev, error }))
  }

  const setLoading = (loading: boolean) => {
    setAuthState(prev => ({ ...prev, isLoading: loading }))
  }

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    updateUser,
    setError,
    setLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}