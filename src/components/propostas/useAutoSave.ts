import { useCallback, useEffect, useRef } from 'react'
import { PropostaFormData } from './types'

export function useAutoSave(formData: PropostaFormData, enabled: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>('')

  const saveRascunho = useCallback(async (data: PropostaFormData) => {
    try {
      const rascunhoData = { ...data, status: 'RASCUNHO' }

      await fetch('/api/propostas/rascunho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rascunhoData),
      })
    } catch {
      // auto-save silencioso — erros não interrompem o usuário
    }
  }, [])

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
