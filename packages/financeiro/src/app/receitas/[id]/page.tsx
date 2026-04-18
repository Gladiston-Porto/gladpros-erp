// app/financeiro/receitas/[id]/page.tsx
// Página de detalhes de receita

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  User,
  Tag,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
} from 'lucide-react';

interface Revenue {
  id: number;
  descricao: string;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
  status: 'PENDENTE' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';
  tipo: string;
  formaPagamento: string;
  observacoes: string | null;
  recorrente: boolean;
  criadoEm: string;
  atualizadoEm: string;
  empresa: {
    id: number;
    nome: string;
    razaoSocial: string;
  };
  categoria: {
    id: number;
    nome: string;
    cor: string;
    icone: string;
  };
  cliente: {
    id: number;
    nomeCompleto?: string;
    razaoSocial?: string;
    email: string;
    telefone: string;
  } | null;
  recorrencia: {
    id: number;
    frequencia: string;
    diaVencimento: number;
    dataInicio: string;
    dataFim: string | null;
    proximaGeracao: string;
    ativo: boolean;
  } | null;
}

export default function RevenueDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, [id]);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/financeiro/receitas/${id}`);
      const data = await response.json();

      if (data.success) {
        setRevenue(data.data);
      } else {
        alert('Receita não encontrada');
        router.push('/financeiro/receitas');
      }
    } catch (error) {
      console.error('Erro ao buscar receita:', error);
      alert('Erro ao buscar receita');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja cancelar esta receita?')) {
      return;
    }

    try {
      const response = await fetch(`/api/financeiro/receitas/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        router.push('/financeiro/receitas');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao cancelar receita:', error);
      alert('Erro ao cancelar receita');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      PENDENTE: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: AlertCircle,
        label: 'Pendente',
      },
      RECEBIDA: {
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle2,
        label: 'Recebida',
      },
      VENCIDA: {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: AlertCircle,
        label: 'Vencida',
      },
      CANCELADA: {
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: AlertCircle,
        label: 'Cancelada',
      },
    };

    return configs[status as keyof typeof configs];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!revenue) {
    return null;
  }

  const statusConfig = getStatusConfig(revenue.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalhes da Receita</h1>
              <p className="text-gray-600 mt-1">ID: #{revenue.id}</p>
            </div>
          </div>

          <div className="flex space-x-3">
            {revenue.status !== 'RECEBIDA' && revenue.status !== 'CANCELADA' && (
              <>
                <button
                  onClick={() => router.push(`/financeiro/receitas/${id}/editar`)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${statusConfig.color}`}
          >
            <StatusIcon className="w-4 h-4 mr-2" />
            {statusConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Gerais */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informações Gerais
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Descrição
                  </label>
                  <p className="text-lg text-gray-900">{revenue.descricao}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Tipo
                    </label>
                    <p className="text-gray-900">{revenue.tipo}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Forma de Pagamento
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {revenue.formaPagamento}
                    </p>
                  </div>
                </div>

                {revenue.observacoes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Observações
                    </label>
                    <p className="text-gray-900">{revenue.observacoes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Valores e Datas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Valores e Datas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Valor
                  </label>
                  <p className="text-3xl font-bold text-green-800">
                    {formatCurrency(revenue.valor)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-500 mb-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      Data de Emissão
                    </label>
                    <p className="text-gray-900">{formatDate(revenue.dataEmissao)}</p>
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-500 mb-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      Data de Vencimento
                    </label>
                    <p className="text-gray-900">{formatDate(revenue.dataVencimento)}</p>
                  </div>

                  {revenue.dataPagamento && (
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-500 mb-1">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Data de Pagamento
                      </label>
                      <p className="text-green-600 font-medium">
                        {formatDate(revenue.dataPagamento)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recorrência */}
            {revenue.recorrente && revenue.recorrencia && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Recorrência
                </h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Frequência
                      </label>
                      <p className="text-blue-900">{revenue.recorrencia.frequencia}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Dia do Vencimento
                      </label>
                      <p className="text-blue-900">Dia {revenue.recorrencia.diaVencimento}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Data de Início
                      </label>
                      <p className="text-blue-900">
                        {formatDate(revenue.recorrencia.dataInicio)}
                      </p>
                    </div>

                    {revenue.recorrencia.dataFim && (
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Data de Fim
                        </label>
                        <p className="text-blue-900">
                          {formatDate(revenue.recorrencia.dataFim)}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Próxima Geração
                      </label>
                      <p className="text-blue-900">
                        {formatDate(revenue.recorrencia.proximaGeracao)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Status
                      </label>
                      <p className="text-blue-900">
                        {revenue.recorrencia.ativo ? 'Ativa' : 'Inativa'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categoria */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                Categoria
              </h3>
              <div
                className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${revenue.categoria.cor}20`,
                  color: revenue.categoria.cor,
                }}
              >
                {revenue.categoria.nome}
              </div>
            </div>

            {/* Cliente */}
            {revenue.cliente && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Cliente
                </h3>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">
                    {revenue.cliente.nomeCompleto || revenue.cliente.razaoSocial}
                  </p>
                  <p className="text-sm text-gray-600">{revenue.cliente.email}</p>
                  <p className="text-sm text-gray-600">{revenue.cliente.telefone}</p>
                </div>
              </div>
            )}

            {/* Empresa */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Empresa</h3>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{revenue.empresa.nome}</p>
                <p className="text-sm text-gray-600">{revenue.empresa.razaoSocial}</p>
              </div>
            </div>

            {/* Metadados */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Metadados</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="text-gray-500">Criado em:</label>
                  <p className="text-gray-900">{formatDateTime(revenue.criadoEm)}</p>
                </div>
                <div>
                  <label className="text-gray-500">Atualizado em:</label>
                  <p className="text-gray-900">{formatDateTime(revenue.atualizadoEm)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
