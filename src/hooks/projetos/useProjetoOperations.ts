/**
 * Hook personalizado para operações de projetos
 */

import { useState, useCallback } from 'react';
import type {
  ProjetoInput,
  Projeto,
  ProjetoListResponse,
  ProjetoFilters,
} from '@/lib/projetos/types';

export interface UseProjetoOperationsOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useProjetoOperations({
  onSuccess,
  onError,
}: UseProjetoOperationsOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Buscar lista de projetos
  const fetchProjetos = useCallback(
    async (filters?: ProjetoFilters): Promise<ProjetoListResponse> => {
      setFetching(true);
      try {
        const params = new URLSearchParams();
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
              params.append(key, String(value));
            }
          });
        }

        const response = await fetch(`/api/projetos?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao buscar projetos');
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setFetching(false);
      }
    },
    [onError]
  );

  // Buscar projeto por ID
  const fetchProjeto = useCallback(
    async (id: number): Promise<Projeto> => {
      setFetching(true);
      try {
        const response = await fetch(`/api/projetos/${id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao buscar projeto');
        }

        return result.projeto;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setFetching(false);
      }
    },
    [onError]
  );

  // Criar projeto
  const createProjeto = useCallback(
    async (data: ProjetoInput): Promise<Projeto> => {
      setLoading(true);
      try {
        const response = await fetch('/api/projetos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao criar projeto');
        }

        onSuccess?.('Projeto criado com sucesso!');
        return result.projeto;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // Atualizar projeto
  const updateProjeto = useCallback(
    async (id: number, data: Partial<ProjetoInput>): Promise<Projeto> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projetos/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao atualizar projeto');
        }

        onSuccess?.('Projeto atualizado com sucesso!');
        return result.projeto;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // Deletar projeto
  const deleteProjeto = useCallback(
    async (id: number): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projetos/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao deletar projeto');
        }

        onSuccess?.('Projeto deletado com sucesso!');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // Atualizar status do projeto
  const updateProjetoStatus = useCallback(
    async (id: number, status: string): Promise<Projeto> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projetos/${id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao atualizar status');
        }

        onSuccess?.('Status atualizado com sucesso!');
        return result.projeto;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // ==================== ETAPAS ====================

  // Listar etapas do projeto
  const listEtapas = useCallback(
    async (projetoId: number): Promise<any[]> => {
      setFetching(true);
      try {
        const response = await fetch(`/api/projetos/${projetoId}/etapas`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao buscar etapas');
        }

        return result.etapas || [];
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setFetching(false);
      }
    },
    [onError]
  );

  // Criar etapa
  const createEtapa = useCallback(
    async (projetoId: number, data: any): Promise<any> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projetos/${projetoId}/etapas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao criar etapa');
        }

        onSuccess?.('Etapa criada com sucesso!');
        return result.etapa;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // Atualizar etapa
  const updateEtapa = useCallback(
    async (etapaId: number, data: any): Promise<any> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projetos/etapas/${etapaId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao atualizar etapa');
        }

        onSuccess?.('Etapa atualizada com sucesso!');
        return result.etapa;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // Deletar etapa
  const deleteEtapa = useCallback(
    async (etapaId: number): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projetos/etapas/${etapaId}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao deletar etapa');
        }

        onSuccess?.('Etapa deletada com sucesso!');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // Reordenar etapas
  const reordenarEtapas = useCallback(
    async (projetoId: number, orderedIds: number[]): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projetos/${projetoId}/etapas/reordenar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderedIds }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao reordenar etapas');
        }

        onSuccess?.('Ordem atualizada com sucesso!');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado';
        onError?.(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    loading,
    fetching,
    fetchProjetos,
    fetchProjeto,
    createProjeto,
    updateProjeto,
    deleteProjeto,
    updateProjetoStatus,
    // Etapas
    listEtapas,
    createEtapa,
    updateEtapa,
    deleteEtapa,
    reordenarEtapas,
  };
}
