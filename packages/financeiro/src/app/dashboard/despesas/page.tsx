/**
 * Página: Lista de Despesas
 * 
 * Features:
 * - Lista paginada de despesas
 * - Filtros avançados (status, tipo, data, valor)
 * - Estatísticas e cards de resumo
 * - Ações: criar, editar, excluir, aprovar, pagar
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckSquare,
  CreditCard
} from 'lucide-react';

interface Expense {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  formaPagamento: string;
  status: string;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
  requerAprovacao: boolean;
  categoria: {
    id: number;
    nome: string;
    cor: string;
    icone: string;
  };
  fornecedor?: {
    id: number;
    nome: string;
  };
  usuario?: {
    id: number;
    nome: string;
  };
  aprovacao?: {
    status: string;
    aprovador: {
      nome: string;
    };
  };
}

interface ExpenseStats {
  totalValor: number;
  mediaValor: number;
  totalDespesas: number;
}

interface ExpenseMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function DespesasPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [meta, setMeta] = useState<ExpenseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState({
    empresaId: 1,
    status: '',
    tipo: '',
    categoriaId: '',
    search: '',
    dataVencimentoInicio: '',
    dataVencimentoFim: '',
    valorMin: '',
    valorMax: '',
    page: 1,
    limit: 20,
    sortBy: 'dataVencimento',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

  // Carregar despesas
  useEffect(() => {
    loadExpenses();
  }, [filters]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await fetch(`/api/financeiro/despesas?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setExpenses(data.data);
        setStats(data.stats);
        setMeta(data.meta);
      } else {
        setError(data.error || 'Erro ao carregar despesas');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      empresaId: 1,
      status: '',
      tipo: '',
      categoriaId: '',
      search: '',
      dataVencimentoInicio: '',
      dataVencimentoFim: '',
      valorMin: '',
      valorMax: '',
      page: 1,
      limit: 20,
      sortBy: 'dataVencimento',
      sortOrder: 'desc'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      PENDENTE: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Pendente' },
      AGUARDANDO_APROVACAO: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, label: 'Aguardando' },
      APROVADA: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Aprovada' },
      REJEITADA: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejeitada' },
      PAGA: { color: 'bg-blue-100 text-blue-700', icon: CheckSquare, label: 'Paga' },
      CANCELADA: { color: 'bg-gray-100 text-gray-500', icon: XCircle, label: 'Cancelada' }
    };

    const badge = badges[status] || badges.PENDENTE;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
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

  const isOverdue = (dataVencimento: string, status: string) => {
    if (status === 'PAGA' || status === 'CANCELADA') return false;
    return new Date(dataVencimento) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Despesas</h1>
            <p className="text-gray-600 mt-1">Gerencie suas despesas e pagamentos</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/financeiro/despesas/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Despesa
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total de Despesas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDespesas}</p>
                </div>
                <FileText className="w-10 h-10 text-red-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalValor)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-red-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Médio</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.mediaValor)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Página Atual</p>
                  <p className="text-2xl font-bold text-gray-900">{meta?.page} / {meta?.totalPages}</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-500 opacity-80" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filtros</span>
              {Object.values(filters).filter(v => v && v !== 1 && v !== 20 && v !== 'dataVencimento' && v !== 'desc').length > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  {Object.values(filters).filter(v => v && v !== 1 && v !== 20 && v !== 'dataVencimento' && v !== 'desc').length}
                </span>
              )}
            </button>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Descrição, número do documento..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
                <option value="APROVADA">Aprovada</option>
                <option value="REJEITADA">Rejeitada</option>
                <option value="PAGA">Paga</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="OPERACIONAL">Operacional</option>
                <option value="ADMINISTRATIVA">Administrativa</option>
                <option value="PESSOAL">Pessoal</option>
                <option value="MARKETING">Marketing</option>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="IMPOSTOS">Impostos</option>
                <option value="ALUGUEL">Aluguel</option>
                <option value="SERVICOS">Serviços</option>
                <option value="FORNECEDORES">Fornecedores</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            {/* Data Vencimento Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimento De
              </label>
              <input
                type="date"
                value={filters.dataVencimentoInicio}
                onChange={(e) => handleFilterChange('dataVencimentoInicio', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Data Vencimento Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimento Até
              </label>
              <input
                type="date"
                value={filters.dataVencimentoFim}
                onChange={(e) => handleFilterChange('dataVencimentoFim', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-500 focus:border-transparent"
              />
            </div>

            {/* Valor Mínimo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Mínimo
              </label>
              <input
                type="number"
                value={filters.valorMin}
                onChange={(e) => handleFilterChange('valorMin', e.target.value)}
                placeholder="R$ 0,00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Valor Máximo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Máximo
              </label>
              <input
                type="number"
                value={filters.valorMax}
                onChange={(e) => handleFilterChange('valorMax', e.target.value)}
                placeholder="R$ 100.000,00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando despesas...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={loadExpenses}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma despesa encontrada</p>
            <button
              onClick={() => router.push('/dashboard/financeiro/despesas/novo')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Criar primeira despesa
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimento
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
                  {expenses.map((expense) => (
                    <tr 
                      key={expense.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        isOverdue(expense.dataVencimento, expense.status) ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{expense.descricao}</p>
                          {expense.fornecedor && (
                            <p className="text-sm text-gray-500">{expense.fornecedor.nome}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                          style={{ backgroundColor: `${expense.categoria.cor}20`, color: expense.categoria.cor }}
                        >
                          {expense.categoria.nome}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-red-600">{formatCurrency(expense.valor)}</p>
                        <p className="text-xs text-gray-500">{expense.formaPagamento}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className={`text-sm ${isOverdue(expense.dataVencimento, expense.status) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                            {formatDate(expense.dataVencimento)}
                          </p>
                          {isOverdue(expense.dataVencimento, expense.status) && (
                            <p className="text-xs text-red-600">Vencida</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(expense.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/financeiro/despesas/${expense.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {expense.status !== 'PAGA' && expense.status !== 'CANCELADA' && (
                            <button
                              onClick={() => router.push(`/dashboard/financeiro/despesas/${expense.id}/editar`)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {expense.status === 'APROVADA' && !expense.dataPagamento && (
                            <button
                              onClick={() => router.push(`/dashboard/financeiro/despesas/${expense.id}/pagar`)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Registrar pagamento"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(meta.page - 1) * filters.limit + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(meta.page * filters.limit, meta.total)}</span> de{' '}
                  <span className="font-medium">{meta.total}</span> despesas
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={!meta.hasPreviousPage}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium">
                    Página {meta.page} de {meta.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={!meta.hasNextPage}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
