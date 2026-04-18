/**
 * Página: Detalhes da Despesa
 * 
 * Features:
 * - Visualização completa da despesa
 * - Histórico de aprovação
 * - Ações: editar, cancelar, aprovar, rejeitar, pagar
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  User,
  Building2,
  Package,
  Tag,
  Hash,
  MessageSquare
} from 'lucide-react';

interface Expense {
  id: number;
  empresaId: number;
  categoriaId: number;
  fornecedorId: number | null;
  descricao: string;
  valor: number;
  tipo: string;
  formaPagamento: string;
  status: string;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
  requerAprovacao: boolean;
  aprovacaoId: number | null;
  anexoUrl: string | null;
  numeroDocumento: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  categoria: {
    id: number;
    nome: string;
    descricao: string;
    cor: string;
    icone: string;
    orcamentoMensal: number | null;
  };
  fornecedor?: {
    id: number;
    nome: string;
    documento: string;
    email: string;
    telefone: string;
  };
  usuario?: {
    id: number;
    nome: string;
    email: string;
  };
  aprovacao?: {
    id: number;
    status: string;
    aprovadorId: number;
    tipoAprovador: string;
    nivelAprovacao: number;
    solicitadoEm: string;
    revisadoEm: string | null;
    justificativa: string | null;
    comentario: string | null;
    aprovador: {
      id: number;
      nome: string;
      email: string;
    };
  };
  empresa: {
    id: number;
    nome: string;
  };
}

export default function DespesaDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadExpense();
    }
  }, [id]);

  const loadExpense = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/financeiro/despesas/${id}`);
      const data = await response.json();

      if (data.success) {
        setExpense(data.data);
      } else {
        setError(data.error || 'Erro ao carregar despesa');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja cancelar esta despesa?')) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/financeiro/despesas/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Despesa cancelada com sucesso!');
        router.push('/dashboard/financeiro/despesas');
      } else {
        alert(data.error || 'Erro ao cancelar despesa');
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      PENDENTE: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Pendente' },
      AGUARDANDO_APROVACAO: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, label: 'Aguardando Aprovação' },
      APROVADA: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Aprovada' },
      REJEITADA: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejeitada' },
      PAGA: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Paga' },
      CANCELADA: { color: 'bg-gray-100 text-gray-500', icon: XCircle, label: 'Cancelada' }
    };

    const badge = badges[status] || badges.PENDENTE;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando despesa...</p>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error || 'Despesa não encontrada'}</p>
          <button
            onClick={() => router.push('/dashboard/financeiro/despesas')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  const isOverdue = new Date(expense.dataVencimento) < new Date() && 
                     expense.status !== 'PAGA' && 
                     expense.status !== 'CANCELADA';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{expense.descricao}</h1>
              <p className="text-gray-600 mt-1">Despesa #{expense.id}</p>
            </div>
            <div className="flex items-center gap-3">
              {expense.status !== 'PAGA' && expense.status !== 'CANCELADA' && expense.status !== 'AGUARDANDO_APROVACAO' && (
                <button
                  onClick={() => router.push(`/dashboard/financeiro/despesas/${id}/editar`)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              )}
              {expense.status !== 'PAGA' && expense.status !== 'CANCELADA' && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Principal */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Valor da Despesa</p>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(expense.valor)}</p>
                  </div>
                </div>
                {getStatusBadge(expense.status)}
              </div>

              {isOverdue && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Despesa Vencida</p>
                    <p className="text-red-700 text-sm">
                      Esta despesa venceu em {formatDate(expense.dataVencimento)}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categoria</p>
                  <span 
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${expense.categoria.cor}20`, color: expense.categoria.cor }}
                  >
                    <Tag className="w-4 h-4" />
                    {expense.categoria.nome}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Tipo</p>
                  <p className="font-medium text-gray-900">{expense.tipo}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Forma de Pagamento</p>
                  <p className="font-medium text-gray-900">{expense.formaPagamento}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Data de Emissão</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{formatDate(expense.dataEmissao)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Data de Vencimento</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(expense.dataVencimento)}
                    </p>
                  </div>
                </div>

                {expense.dataPagamento && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Data de Pagamento</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="font-medium text-gray-900">{formatDate(expense.dataPagamento)}</p>
                    </div>
                  </div>
                )}

                {expense.numeroDocumento && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Número do Documento</p>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <p className="font-medium text-gray-900">{expense.numeroDocumento}</p>
                    </div>
                  </div>
                )}

                {expense.observacoes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Observações</p>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                      <p className="text-gray-900 whitespace-pre-wrap">{expense.observacoes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Aprovação */}
            {expense.requerAprovacao && expense.aprovacao && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  {expense.aprovacao.status === 'APROVADA' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : expense.aprovacao.status === 'REJEITADA' ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">Histórico de Aprovação</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status da Aprovação</p>
                      <p className="font-medium text-gray-900">{expense.aprovacao.status}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Nível de Aprovação</p>
                      <p className="font-medium text-gray-900">Nível {expense.aprovacao.nivelAprovacao}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Tipo de Aprovador</p>
                      <p className="font-medium text-gray-900">{expense.aprovacao.tipoAprovador}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Aprovador</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900">{expense.aprovacao.aprovador.nome}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Solicitado em</p>
                      <p className="font-medium text-gray-900">{formatDateTime(expense.aprovacao.solicitadoEm)}</p>
                    </div>

                    {expense.aprovacao.revisadoEm && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Revisado em</p>
                        <p className="font-medium text-gray-900">{formatDateTime(expense.aprovacao.revisadoEm)}</p>
                      </div>
                    )}
                  </div>

                  {expense.aprovacao.justificativa && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Justificativa</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{expense.aprovacao.justificativa}</p>
                    </div>
                  )}

                  {expense.aprovacao.comentario && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Comentário do Aprovador</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{expense.aprovacao.comentario}</p>
                    </div>
                  )}
                </div>

                {expense.aprovacao.status === 'PENDENTE' && (
                  <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                    <button
                      onClick={() => router.push(`/dashboard/financeiro/despesas/${id}/aprovar`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/financeiro/despesas/${id}/rejeitar`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Informações Adicionais */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Informações Adicionais</h3>
              
              <div className="space-y-4">
                {expense.fornecedor && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Fornecedor</p>
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{expense.fornecedor.nome}</p>
                        <p className="text-sm text-gray-600">{expense.fornecedor.documento}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">Empresa</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{expense.empresa.nome}</p>
                  </div>
                </div>

                {expense.usuario && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Criado por</p>
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{expense.usuario.nome}</p>
                        <p className="text-sm text-gray-600">{expense.usuario.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">Registro</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900">
                      Criado: {formatDateTime(expense.criadoEm)}
                    </p>
                    <p className="text-sm text-gray-900">
                      Atualizado: {formatDateTime(expense.atualizadoEm)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            {expense.status === 'APROVADA' && !expense.dataPagamento && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Ações Disponíveis</h3>
                <button
                  onClick={() => router.push(`/dashboard/financeiro/despesas/${id}/pagar`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <CreditCard className="w-5 h-5" />
                  Registrar Pagamento
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
