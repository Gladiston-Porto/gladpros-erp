// app/financeiro/despesas/page.tsx
// Página de listagem de despesas com filtros

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
  TrendingDown
} from 'lucide-react';
import { 
  PageHeader, 
  Button, 
  Card, 
  CardContent, 
  Badge
} from '@gladpros/ui';

interface Expense {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
  tipo: string;
  formaPagamento: string;
  categoria: {
    nome: string;
    cor: string;
    icone: string;
  };
  fornecedor?: {
    nome?: string;
    email?: string;
  };
  recorrente: boolean;
}

interface Filters {
  status?: string;
  categoriaId?: number;
  fornecedorId?: number;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
}

export default function DespesasPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
    fetchExpenses();
  }, [filters, pagination.page]);

  const fetchExpenses = async () => {
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

      // TODO: Implementar API real
      // const response = await fetch(`/api/financeiro/despesas?${params}`);
      // const data = await response.json();
      
      // Mock data for now
      const data = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        totais: { valorTotal: 0, quantidade: 0 }
      };

      if (data.success) {
        setExpenses(data.data);
        setPagination(data.pagination);
        setTotais(data.totais);
      }
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGA':
        return <Badge variant="success" className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Paga</Badge>;
      case 'PENDENTE':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'VENCIDA':
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" /> Vencida</Badge>;
      case 'CANCELADA':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200"><XCircle className="w-3 h-3 mr-1" /> Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Despesas" 
        description="Gerencie suas contas a pagar e despesas"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Despesas' }
        ]}
        actions={
          <Button onClick={() => router.push('/financeiro/despesas/nova')} variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total a Pagar</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.valorTotal)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Add more stats cards as needed */}
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200 dark:border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por descrição, fornecedor..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-slate-100 dark:bg-white/10' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Período
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Add filter inputs here */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Status</label>
                <select 
                  aria-label="Filtrar por status"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGA">Paga</option>
                  <option value="VENCIDA">Vencida</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Carregando despesas...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma despesa encontrada.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {expense.descricao}
                      <div className="text-xs text-slate-500 font-normal mt-0.5">
                        {expense.categoria.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {expense.fornecedor?.nome || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(expense.dataVencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.valor)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(expense.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">Detalhes</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-sm text-slate-500">
          <div>
            Mostrando {expenses.length} de {pagination.total} registros
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page === 1}
              onClick={() => setPagination({...pagination, page: pagination.page - 1})}
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({...pagination, page: pagination.page + 1})}
            >
              Próxima
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
