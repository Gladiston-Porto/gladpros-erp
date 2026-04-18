import { renderHook, act } from '@testing-library/react'
import { useClienteOperations } from '@/shared/hooks/useClienteOperations'
import type { ClienteCreateInput, ClienteUpdateInput } from '@/shared/types/cliente'

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const mockCreateInput: ClienteCreateInput = {
  tipo: 'PF',
  nomeCompleto: 'João Silva',
  email: 'joao@email.com',
  telefone: '11999999999',
  endereco1: 'Rua A, 123',
  cidade: 'São Paulo',
  estado: 'SP',
  zipcode: '01310-100',
  ssn: '123456789'
}

const mockUpdateInput: ClienteUpdateInput = {
  nomeCompleto: 'João Silva Updated',
  email: 'joao.updated@email.com'
}

describe('useClienteOperations', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('createCliente', () => {
    it('successfully creates a cliente', async () => {
      const mockResponse = { id: 1, ...mockCreateInput }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const onSuccess = jest.fn()
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess, onError })
      )

      await act(async () => {
        await result.current.createCliente(mockCreateInput)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCreateInput),
      })
      expect(onSuccess).toHaveBeenCalledWith('Cliente criado com sucesso!')
      expect(onError).not.toHaveBeenCalled()
    })

    it('handles create error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Erro ao criar cliente' }),
      } as Response)

      const onSuccess = jest.fn()
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess, onError })
      )

      try {
        await act(async () => {
          await result.current.createCliente(mockCreateInput)
        })
      } catch {
        // Expected error
      }

      expect(onError).toHaveBeenCalledWith('Erro ao criar cliente')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('sets loading state during create', async () => {
      let resolveCreate: (value: { ok: boolean; json: () => Promise<{ id: number } & ClienteCreateInput> }) => void
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve
      })

      mockFetch.mockImplementationOnce(() => createPromise as Promise<Response>)

      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess: jest.fn(), onError: jest.fn() })
      )

      // Start create operation
      act(() => {
        result.current.createCliente(mockCreateInput)
      })

      // Should be loading
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolveCreate!({
          ok: true,
          json: async () => ({ id: 1, ...mockCreateInput }),
        })
      })

      // Should not be loading anymore
      expect(result.current.loading).toBe(false)
    })
  })

  describe('updateCliente', () => {
    it('successfully updates a cliente', async () => {
      const mockResponse = { id: 1, ...mockUpdateInput }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const onSuccess = jest.fn()
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess, onError })
      )

      await act(async () => {
        await result.current.updateCliente(1, mockUpdateInput)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/clientes/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdateInput),
      })
      expect(onSuccess).toHaveBeenCalledWith('Cliente atualizado com sucesso!')
      expect(onError).not.toHaveBeenCalled()
    })

    it('handles update error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cliente não encontrado' }),
      } as Response)

      const onSuccess = jest.fn()
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess, onError })
      )

      try {
        await act(async () => {
          await result.current.updateCliente(999, mockUpdateInput)
        })
      } catch {
        // Expected error
      }

      expect(onError).toHaveBeenCalledWith('Cliente não encontrado')
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('deleteCliente', () => {
    it('successfully deletes a cliente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Cliente inativado' }),
      } as Response)

      const onSuccess = jest.fn()
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess, onError })
      )

      await act(async () => {
        await result.current.deleteCliente(1)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/clientes/1', {
        method: 'DELETE',
      })
      expect(onSuccess).toHaveBeenCalledWith('Cliente inativado com sucesso!')
      expect(onError).not.toHaveBeenCalled()
    })

    it('handles delete error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Não autorizado' }),
      } as Response)

      const onSuccess = jest.fn()
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess, onError })
      )

      try {
        await act(async () => {
          await result.current.deleteCliente(1)
        })
      } catch {
        // Expected error
      }

      expect(onError).toHaveBeenCalledWith('Não autorizado')
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('network errors', () => {
    it('handles network error in create', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const onSuccess = jest.fn()
      const onError = jest.fn()
      
      const { result } = renderHook(() => 
        useClienteOperations({ onSuccess, onError })
      )

      try {
        await act(async () => {
          await result.current.createCliente(mockCreateInput)
        })
      } catch {
        // Expected error
      }

      expect(onError).toHaveBeenCalledWith('Network error')
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })
})
