// src/shared/services/clienteService.ts
import type { ClienteDTO, ClienteCreateInput, ClienteUpdateInput, ClienteFilters, ClienteListResponse } from '@/shared/types/cliente'

type ApiEnvelope<T> = {
  data?: T
  success?: boolean
  error?: string
  message?: string
  details?: unknown
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
}

type ServiceError = Error & { details?: unknown }

async function buildServiceError(response: Response, fallback: string): Promise<ServiceError> {
  const payload = await response.json().catch(() => ({ error: fallback }))
  const message = typeof payload?.message === 'string'
    ? payload.message
    : typeof payload?.error === 'string'
      ? payload.error
      : fallback

  const error = new Error(message) as ServiceError
  if (payload && typeof payload === 'object' && 'details' in payload) {
    error.details = payload.details
  }
  return error
}

function unwrapApiData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T
  }
  return payload as T
}

function normalizeListResponse(payload: ClienteListResponse | ApiEnvelope<ClienteDTO[]>): ClienteListResponse {
  if (payload && typeof payload === 'object' && 'pagination' in payload && payload.pagination) {
    return {
      data: payload.data ?? [],
      page: payload.pagination.page,
      pageSize: payload.pagination.pageSize,
      total: payload.pagination.total,
      totalPages: payload.pagination.totalPages,
    }
  }

  return payload as ClienteListResponse
}

export class ClienteService {
  private static readonly BASE_URL = '/api/clientes'

  static async getClientes(filters?: ClienteFilters, signal?: AbortSignal): Promise<ClienteListResponse> {
    const params = new URLSearchParams()

    if (filters?.q) params.append('q', filters.q)
    if (filters?.tipo && filters.tipo !== 'all') params.append('tipo', filters.tipo)
    if (filters?.ativo !== undefined && filters.ativo !== 'all') params.append('ativo', filters.ativo.toString())
    if (filters?.addressCity) params.append('addressCity', filters.addressCity)
    if (filters?.addressState) params.append('addressState', filters.addressState)
    if (filters?.addressCounty) params.append('addressCounty', filters.addressCounty)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString())
    if (filters?.sortKey) params.append('sortKey', filters.sortKey)
    if (filters?.sortDir) params.append('sortDir', filters.sortDir)

    const response = await fetch(`${this.BASE_URL}?${params}`, { signal })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao carregar clientes')
    }
    return normalizeListResponse(await response.json())
  }

  static async getClienteById(id: number, signal?: AbortSignal): Promise<ClienteDTO> {
    const response = await fetch(`${this.BASE_URL}/${id}`, { signal })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao carregar cliente')
    }
    return unwrapApiData(await response.json())
  }

  static async createCliente(data: ClienteCreateInput): Promise<ClienteDTO> {
    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao criar cliente')
    }
    return unwrapApiData(await response.json())
  }

  static async updateCliente(id: number, data: ClienteUpdateInput): Promise<ClienteDTO> {
    const response = await fetch(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao atualizar cliente')
    }
    return unwrapApiData(await response.json())
  }

  static async deleteCliente(id: number): Promise<void> {
    const response = await fetch(`${this.BASE_URL}/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao deletar cliente')
    }
  }

  static async toggleClienteStatus(id: number): Promise<ClienteDTO> {
    const response = await fetch(`${this.BASE_URL}/${id}/toggle-status`, { method: 'PUT', credentials: 'include' })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao alterar status do cliente')
    }
    return unwrapApiData(await response.json())
  }

  static async exportClientesCSV(filters?: ClienteFilters, selectedIds?: number[]): Promise<Blob> {
    const response = await fetch(`${this.BASE_URL}/export/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ filters, selectedIds }),
    })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao exportar CSV')
    }
    return response.blob()
  }

  static async exportClientesPDF(filters?: ClienteFilters, selectedIds?: number[]): Promise<Blob> {
    const response = await fetch(`${this.BASE_URL}/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ filters, selectedIds }),
    })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao exportar PDF')
    }
    return response.blob()
  }

  static async bulkClientes(
    action: 'activate' | 'deactivate' | 'delete',
    scope: 'selected' | 'allFiltered',
    options?: { ids?: number[]; filters?: ClienteFilters }
  ): Promise<{ processed: number }> {
    const response = await fetch(`${this.BASE_URL}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action,
        scope,
        ids: options?.ids,
        filters: options?.filters,
      }),
    })

    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao executar ação em lote')
    }

    const payload = await response.json()
    return payload.data ?? { processed: 0 }
  }

  static async getClientesForSelect(limit = 1000, signal?: AbortSignal): Promise<ClienteDTO[]> {
    const response = await fetch(`${this.BASE_URL}?pageSize=${limit}&ativo=true`, { signal })
    if (!response.ok) {
      throw await buildServiceError(response, 'Erro ao carregar clientes')
    }
    const result = normalizeListResponse(await response.json())
    return result.data
  }
}
