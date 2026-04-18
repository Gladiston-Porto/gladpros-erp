import { useAuth } from './useAuth'

interface UseLogoutReturn {
  logout: () => void
  isAuthenticated: boolean
}

export function useLogout(): UseLogoutReturn {
  const { logout: authLogout, isAuthenticated } = useAuth()

  const logout = () => {
    // Clear any additional session data if needed
    authLogout()
  }

  return {
    logout,
    isAuthenticated
  }
}