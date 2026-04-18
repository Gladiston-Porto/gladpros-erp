// app/financeiro/receitas/page.tsx
// Página de listagem de receitas com filtros

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

interface Revenue {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: 'PENDENTE' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';
  tipo: string;
  formaPagamento: string;
  categoria: {
    nome: string;
    cor: string;
    icone: string;
  };
  cliente?: {
    nomeCompleto?: string;
    razaoSocial?: string;
    email: string;
  };
  recorrente: boolean;
}

interface Filters {
  status?: string;
  categoriaId?: number;
  clienteId?: number;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
}

export default function ReceitasPage() {
  const router = useRouter();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [totais, setTotais] = useState({ valorTotal: 0, quantidade: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  // Mock empresaId - em produção viria do contexto/auth
  const empresaId = 1;

  useEffect(() => {
    fetchRevenues();
  }, [filters, pagination.page]);

  const fetchRevenues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        empresaId: empresaId.toString(),
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.dataInicio && { dataInicio: filters.dataInicio }),
        ...(filters.dataFim && { dataFim: filters.dataFim }),
      });

      const response = await fetch(`/api/financeiro/receitas?${params}`);
      const data = await response.json();

      if (data.success) {
        setRevenues(data.data);
        setPagination(data.pagination);
        setTotais(data.totais);
      }
    } catch (error) {
      console.error('Erro ao buscar receitas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      PENDENTE: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, label: 'Pendente' },
      RECEBIDA: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2, label: 'Recebida' },
      VENCIDA: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle, label: 'Vencida' },
      CANCELADA: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircle, label: 'Cancelada' },
    };

    const config = configs[status as keyof typeof configs];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receitas</h1>
            <p className="text-gray-600 mt-1">Gestão de entradas financeiras</p>
          </div>
          <button
            onClick={() => router.push('/financeiro/receitas/novo')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Receita
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totais.valorTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Quantidade</p>
                <p className="text-2xl font-bold text-gray-900">{totais.quantidade}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <Clock className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenues.filter(r => r.status === 'PENDENTE').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar receitas..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              <select
                aria-label="Filtrar por status"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              >
                <option value="">Todos os status</option>
                <option value="PENDENTE">Pendente</option>
                <option value="RECEBIDA">Recebida</option>
                <option value="VENCIDA">Vencida</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtros
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  aria-label="Data Início"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  aria-label="Data Fim"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : revenues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma receita encontrada
                    </td>
                  </tr>
                ) : (
                  revenues.map((revenue) => (
                    <tr
                      key={revenue.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/financeiro/receitas/${revenue.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {revenue.descricao}
                            </div>
                            <div className="text-sm text-gray-500">
                              {revenue.tipo} • {revenue.formaPagamento}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${revenue.categoria.cor}20`,
                            color: revenue.categoria.cor
                          }}
                        >
                          {revenue.categoria.nome}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {revenue.cliente?.nomeCompleto || revenue.cliente?.razaoSocial || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(revenue.dataVencimento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(revenue.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(revenue.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/financeiro/receitas/${revenue.id}`);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> até{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-medium">{pagination.total}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setPagination({ ...pagination, page })}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
