/**
 * API Client - Módulo Estoque
 * Cliente centralizado para todas as requisições HTTP
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Material,
  MaterialComRelacoes,
  MaterialFormData,
  MaterialFilter,
  Equipamento,
  EquipamentoComRelacoes,
  EquipamentoFormData,
  EquipamentoFilter,
  MaterialMovimentacao,
  MovimentacaoFormData,
  MovimentacaoFilter,
  AlertaEstoque,
  AlertaComRelacoes,
  AlertaFilter,
  Compra,
  CompraComRelacoes,
  SaldoResponse,
} from './types';

// ============================================================================
// CONFIGURAÇÃO BASE
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_PREFIX = '/api/estoque';

// ============================================================================
// HELPER: Request
// ============================================================================

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${API_PREFIX}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Envia cookies (JWT)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

// ============================================================================
// HELPER: Query String
// ============================================================================

 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// ============================================================================
// MATERIAIS
// ============================================================================

export const materiaisApi = {
  /**
   * Lista materiais com filtros e paginação
   */
  list: async (filters?: MaterialFilter & {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Material>>> => {
    const query = buildQueryString(filters || {});
    return request(`/materiais${query}`);
  },

  /**
   * Busca material por ID com relações
   */
  get: async (id: number): Promise<ApiResponse<MaterialComRelacoes>> => {
    return request(`/materiais/${id}`);
  },

  /**
   * Cria novo material
   */
  create: async (data: MaterialFormData): Promise<ApiResponse<Material>> => {
    return request('/materiais', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza material existente
   */
  update: async (
    id: number,
    data: Partial<MaterialFormData>
  ): Promise<ApiResponse<Material>> => {
    return request(`/materiais/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove material (soft delete)
   */
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return request(`/materiais/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Busca saldo detalhado do material por localização
   */
  getSaldo: async (id: number): Promise<ApiResponse<SaldoResponse>> => {
    return request(`/materiais/${id}/saldo`);
  },
};

// ============================================================================
// EQUIPAMENTOS
// ============================================================================

export const equipamentosApi = {
  /**
   * Lista equipamentos com filtros e paginação
   */
  list: async (filters?: EquipamentoFilter & {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Equipamento>>> => {
    const query = buildQueryString(filters || {});
    return request(`/equipamentos${query}`);
  },

  /**
   * Busca equipamento por ID com relações
   */
  get: async (id: number): Promise<ApiResponse<EquipamentoComRelacoes>> => {
    return request(`/equipamentos/${id}`);
  },

  /**
   * Cria novo equipamento
   */
  create: async (
    data: EquipamentoFormData
  ): Promise<ApiResponse<Equipamento>> => {
    return request('/equipamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza equipamento existente
   */
  update: async (
    id: number,
    data: Partial<EquipamentoFormData>
  ): Promise<ApiResponse<Equipamento>> => {
    return request(`/equipamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove equipamento (soft delete)
   */
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return request(`/equipamentos/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Aloca equipamento para projeto
   */
  alocar: async (
    id: number,
    data: {
      projetoId: number;
      responsavelId: number;
      dataAlocacao?: string;
      dataDevolucaoPrevista?: string;
      observacoes?: string;
    }
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<ApiResponse<any>> => {
    return request(`/equipamentos/${id}/alocar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Devolve equipamento de projeto
   */
  devolver: async (
    id: number,
    data: {
      dataDevolucaoReal?: string;
      condicaoRetorno: string;
      observacoes?: string;
     
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<ApiResponse<any>> => {
    return request(`/equipamentos/${id}/devolver`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// MOVIMENTAÇÕES
// ============================================================================

export const movimentacoesApi = {
  /**
   * Lista movimentações com filtros
   */
  list: async (filters?: MovimentacaoFilter & {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<MaterialMovimentacao>>> => {
    const query = buildQueryString(filters || {});
    return request(`/movimentacoes${query}`);
  },

  /**
   * Cria nova movimentação
   */
  create: async (
    data: MovimentacaoFormData
  ): Promise<ApiResponse<MaterialMovimentacao>> => {
    return request('/movimentacoes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// ALERTAS
// ============================================================================

export const alertasApi = {
  /**
   * Lista alertas com filtros
   */
  list: async (filters?: AlertaFilter & {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<ApiResponse<{
    materiais: PaginatedResponse<AlertaEstoque>;
    estatisticas: {
      totalAtivos: number;
      porTipo: Array<{ tipo: string; total: number }>;
      porPrioridade: Array<{ prioridade: string; total: number }>;
    };
  }>> => {
    const query = buildQueryString(filters || {});
    return request(`/alertas${query}`);
  },

  /**
   * Busca alerta por ID
   */
  get: async (id: number): Promise<ApiResponse<AlertaComRelacoes>> => {
    return request(`/alertas/${id}`);
  },

  /**
   * Marca alerta como visualizado
   */
  visualizar: async (id: number): Promise<ApiResponse<AlertaEstoque>> => {
    return request(`/alertas/${id}/visualizar`, {
      method: 'PUT',
    });
  },

  /**
   * Resolve alerta
   */
  resolver: async (
    id: number,
    data: { solucao: string }
  ): Promise<ApiResponse<AlertaEstoque>> => {
    return request(`/alertas/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove alerta
   */
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return request(`/alertas/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Gera alertas automáticos
   */
  gerar: async (): Promise<ApiResponse<{
    alertasGerados: number;
    alertas: AlertaEstoque[];
  }>> => {
    return request('/alertas/gerar', {
      method: 'POST',
    });
  },
};

// ============================================================================
// COMPRAS
// ============================================================================

export const comprasApi = {
  /**
   * Lista compras com filtros
   */
  list: async (filters?: {
    page?: number;
    pageSize?: number;
    fornecedorId?: number;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<ApiResponse<PaginatedResponse<Compra>>> => {
    const query = buildQueryString(filters || {});
    return request(`/compras${query}`);
  },

  /**
   * Busca compra por ID com itens
   */
  get: async (id: number): Promise<ApiResponse<CompraComRelacoes>> => {
    return request(`/compras/${id}`);
  },

  /**
   * Cria nova compra
   */
  create: async (data: {
    fornecedorId: number;
    projetoId?: number;
    numeroNf?: string;
    dataCompra: string;
    dataEntrega?: string;
    tipo: string;
    valorTotal: number;
    desconto?: number;
    frete?: number;
    formaPagamento?: string;
    observacoes?: string;
    itens: Array<{
      tipoItem: string;
      materialId?: number;
      equipamentoId?: number;
      quantidade: number;
      custoUnitario: number;
    }>;
  }): Promise<ApiResponse<Compra>> => {
    return request('/compras', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza compra existente
   */
  update: async (
    id: number,
    data: Partial<{
      numeroNf?: string;
      dataEntrega?: string;
      valorTotal?: number;
      desconto?: number;
      frete?: number;
      formaPagamento?: string;
      observacoes?: string;
    }>
  ): Promise<ApiResponse<Compra>> => {
    return request(`/compras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Recebe itens da compra
   */
  receber: async (
    id: number,
    data: {
      dataRecebimento?: string;
      itensRecebidos: Array<{
        itemId: number;
        quantidadeRecebida: number;
        localizacaoId: number;
        lote?: {
          codigoLote: string;
          dataFabricacao?: string;
          dataValidade?: string;
        };
      }>;
    }
  ): Promise<ApiResponse<Compra>> => {
    return request(`/compras/${id}/receber`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// DASHBOARD
// ============================================================================

export const dashboardApi = {
  /**
   * Busca métricas do dashboard
   */
  get: async (): Promise<ApiResponse<{
    resumo: {
      totalMateriais: number;
      materiaisAtivos: number;
      materiaisAbaixoMinimo: number;
      saldoTotalMateriais: number;
      valorTotalEstoque: number;
      totalEquipamentos: number;
      equipamentosDisponiveis: number;
      equipamentosEmUso: number;
      equipamentosEmManutencao: number;
      valorTotalEquipamentos: number;
      alertasAtivos: number;
      alertasCriticos: number;
      totalLocalizacoes: number;
      fornecedoresAtivos: number;
    };
    atividadesRecentes: {
      movimentacoes: number;
      compras: number;
      valorCompras: number;
     
    };
     
    topItens: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      materiaisMaisMovimentados: Array<any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      equipamentosMaisAlocados: Array<any>;
    };
    estatisticas: {
      movimentacoesPorTipo: Array<{ tipo: string; total: number }>;
      alertasPorTipo: Array<{ tipo: string; total: number }>;
      alertasPorPrioridade: Array<{ prioridade: string; total: number }>;
    };
    indicadores: {
      percentualMateriaisAbaixoMinimo: string;
      percentualEquipamentosDisponiveis: string;
      percentualEquipamentosEmUso: string;
      mediaMovimentacoesDia: string;
      mediaComprasDia: string;
    };
  }>> => {
    return request('/dashboard');
  },
};

// ============================================================================
// RELATÓRIOS
// ============================================================================

export const relatoriosApi = {
  /**
   * Relatório de consumo
   */
  consumo: async (filters?: {
    projetoId?: number;
     
    materialId?: number;
    categoriaId?: number;
    dataInicio?: string;
    dataFim?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<ApiResponse<any>> => {
    const query = buildQueryString(filters || {});
    return request(`/relatorios/consumo${query}`);
  },

  /**
   * Relatório de inventário
   */
   
  inventario: async (filters?: {
    categoriaId?: number;
    localizacaoId?: number;
    apenasAtivos?: boolean;
    incluirValores?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<ApiResponse<any>> => {
    const query = buildQueryString(filters || {});
    return request(`/relatorios/inventario${query}`);
  },
};

// ============================================================================
// EXPORT CENTRALIZADO
// ============================================================================

export const estoqueApi = {
  materiais: materiaisApi,
  equipamentos: equipamentosApi,
  movimentacoes: movimentacoesApi,
  alertas: alertasApi,
  compras: comprasApi,
  dashboard: dashboardApi,
  relatorios: relatoriosApi,
};

export default estoqueApi;
