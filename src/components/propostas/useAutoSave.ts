import { useCallback, useEffect, useRef } from 'react'
import { PropostaFormData } from './types'

export function useAutoSave(formData: PropostaFormData, enabled: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>('')

  const saveRascunho = useCallback(async (data: PropostaFormData) => {
    try {
      console.log('Salvando rascunho automaticamente...')
      
      // Criar um payload simplificado para rascunho
      const rascunhoData = {
        ...data,
        status: 'RASCUNHO'
      }
      
      const response = await fetch('/api/propostas/rascunho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rascunhoData)
      })

      if (response.ok) {
        console.log('Rascunho salvo automaticamente')
        // Opcionalmente mostrar feedback visual discreto
      } else {
        console.warn('Erro ao salvar rascunho:', response.statusText)
      }
    } catch (error) {
      console.warn('Erro no salvamento automático:', error)
    }
  }, [])

  const debouncedSave = useCallback((data: PropostaFormData) => {
    if (!enabled) return

    // Verificar se os dados mudaram (serialização simples)
    const currentData = JSON.stringify(data)
    if (currentData === lastSaveRef.current) return

    // Clear timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Agendar salvamento após 3 segundos sem mudanças
    timeoutRef.current = setTimeout(() => {
      lastSaveRef.current = currentData
      saveRascunho(data)
    }, 3000)
  }, [enabled, saveRascunho])

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { saveRascunho, debouncedSave }
}
