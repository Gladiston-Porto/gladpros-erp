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
  Clock,
  TrendingUp
} from 'lucide-react';
import { 
  PageHeader, 
  Button, 
  Card, 
  CardContent, 
  Badge
} from '@gladpros/ui';

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
    const variants: Record<string, any> = {
      PENDENTE: { variant: 'warning', label: 'Pendente' },
      RECEBIDA: { variant: 'success', label: 'Recebida' },
      VENCIDA: { variant: 'destructive', label: 'Vencida' },
      CANCELADA: { variant: 'secondary', label: 'Cancelada' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Template de Input GladPros v2.0
  const inputClass = `
    h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm 
    outline-none transition focus:border-[#0098DA] hover:border-[#0098DA]
    dark:border-white/10 dark:bg-gray-800 dark:text-white dark:focus:border-[#0098DA]
  `;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Receitas" 
        description="Gerencie todas as entradas financeiras"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Receitas' }
        ]}
        actions={
          <Button onClick={() => router.push('/financeiro/receitas/nova')} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
        }
      />

      {/* Hero Section - Design System v2.0 */}
      <section 
        className="rounded-3xl border border-white/30 bg-gradient-to-br p-6 text-white shadow-2xl shadow-blue-500/20"
        style={{ backgroundImage: 'linear-gradient(135deg, #0098DA 0%, #FF8C00 100%)' }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">FINANCEIRO</p>
            <h2 className="text-2xl font-semibold font-title">Gestão de Receitas</h2>
            <p className="text-sm text-white/80">Controle de faturamento e recebimentos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-white/70">Total Recebido</p>
              <p className="text-2xl font-bold font-title">{formatCurrency(totais.valorTotal)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="space-y-1 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm">Total Lançamentos</p>
            </div>
            <p className="text-2xl font-semibold">{totais.quantidade}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar receitas..."
                className={`${inputClass} pl-10 w-full`}
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <select
              aria-label="Filtrar por status"
              className={inputClass}
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

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full md:w-auto"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avançados
          </Button>
        </div>

        {showFilters && (
          <Card className="bg-gray-50 dark:bg-gray-900 border-none">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Início
                </label>
                <input
                  aria-label="Data Início"
                  type="date"
                  className={inputClass}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Fim
                </label>
                <input
                  aria-label="Data Fim"
                  type="date"
                  className={inputClass}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Carregando...
                      </div>
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
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/financeiro/receitas/${revenue.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {revenue.descricao}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {revenue.cliente?.nomeCompleto || revenue.cliente?.razaoSocial || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {formatDate(revenue.dataVencimento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(revenue.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(revenue.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            router.push(`/financeiro/receitas/${revenue.id}`);
                          }}
                        >
                          Ver detalhes
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Próximo
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> até{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-medium">{pagination.total}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setPagination({ ...pagination, page })}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg ${
                          page === pagination.page
                            ? 'z-10 bg-[#0098DA] border-[#0098DA] text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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
        </Card>
      </div>
    </div>
  );
}
