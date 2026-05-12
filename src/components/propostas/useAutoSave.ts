import { useCallback, useEffect, useRef } from 'react'
import { authenticatedFetch } from '@/lib/api/client'
import { PropostaFormData } from './types'

export function useAutoSave(
  formData: PropostaFormData,
  enabled: boolean = true,
  onSessionExpired?: () => void
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>('')

  const saveRascunho = useCallback(async (data: PropostaFormData) => {
    try {
      const rascunhoData = { ...data, status: 'RASCUNHO' }

      const response = await authenticatedFetch('/api/propostas/rascunho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rascunhoData),
      }, { noRedirectOn401: true }) // Preserve form state on expiry — callback handles UX

      // authenticatedFetch já redireciona para /login em 401,
      // mas chamamos o callback para que o componente possa avisar o usuário antes
      if (response.status === 401 && onSessionExpired) {
        onSessionExpired()
      }
    } catch {
      // auto-save silencioso — erros de rede não interrompem o usuário
    }
  }, [onSessionExpired])

  const debouncedSave = useCallback((data: PropostaFormData) => {
    if (!enabled) return

    const currentData = JSON.stringify(data)
    if (currentData === lastSaveRef.current) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      lastSaveRef.current = currentData
      saveRascunho(data)
    }, 3000)
  }, [enabled, saveRascunho])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { saveRascunho, debouncedSave }
}
