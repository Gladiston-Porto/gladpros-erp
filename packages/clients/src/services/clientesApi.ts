// packages/clients/src/services/clientesApi.ts
import { ClienteListResponse, ClienteFilters, ClienteDTO } from '../types/cliente';

export async function getClientes(filters: ClienteFilters, signal?: AbortSignal): Promise<ClienteListResponse> {
  const params = new URLSearchParams();

  if (filters.q) params.append('q', filters.q);
  if (filters.tipo && filters.tipo !== 'all') params.append('tipo', filters.tipo);
  if (filters.ativo !== 'all') params.append('ativo', String(filters.ativo));
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
  if (filters.sortKey) params.append('sortKey', filters.sortKey);
  if (filters.sortDir) params.append('sortDir', filters.sortDir);

  const response = await fetch(`/api/clientes?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('Erro ao carregar clientes');
  }

  return response.json();
}

export async function getClienteById(id: string): Promise<ClienteDTO> {
  const response = await fetch(`/api/clientes/${id}`);

  if (!response.ok) {
    throw new Error('Erro ao carregar cliente');
  }

  return response.json();
}

export async function deleteCliente(id: string): Promise<void> {
  const response = await fetch(`/api/clientes/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Erro ao remover cliente');
  }
}

export async function toggleClienteStatus(id: string, ativo: boolean): Promise<void> {
  const response = await fetch(`/api/clientes/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ativo }),
  });

  if (!response.ok) {
    throw new Error('Erro ao alterar status do cliente');
  }
}