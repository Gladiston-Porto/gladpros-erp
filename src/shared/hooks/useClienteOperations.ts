import { useState, useCallback } from 'react'
import { ClienteCreateInput, ClienteUpdateInput } from '@/shared/types/cliente'

export interface UseClienteOperationsOptions {
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
}

export function useClienteOperations({ onSuccess, onError }: UseClienteOperationsOptions = {}) {
  const [loading, setLoading] = useState(false)

  // Criar cliente
  const createCliente = useCallback(async (data: ClienteCreateInput) => {
    setLoading(true)
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar cliente')
      }

      onSuccess?.('Cliente criado com sucesso!')
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado'
      onError?.(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [onSuccess, onError])

  // Atualizar cliente
  const updateCliente = useCallback(async (id: number, data: ClienteUpdateInput) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar cliente')
      }

      onSuccess?.('Cliente atualizado com sucesso!')
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado'
      onError?.(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [onSuccess, onError])

  // Inativar cliente
  const deleteCliente = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao inativar cliente')
      }

      onSuccess?.('Cliente inativado com sucesso!')
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado'
      onError?.(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [onSuccess, onError])

  return {
    loading,
    createCliente,
    updateCliente,
    deleteCliente
  }
}
