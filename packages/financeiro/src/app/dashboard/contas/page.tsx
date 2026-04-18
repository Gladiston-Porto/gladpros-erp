"use client";

/**
 * PÁGINA - LISTA DE CONTAS BANCÁRIAS
 * 
 * Features:
 * - Cards com resumo de saldos
 * - Lista de contas com filtros
 * - Ações rápidas (ver extrato, transferir)
 * - Estatísticas consolidadas
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle,
  Wallet,
  PiggyBank,
  LineChart,
  Landmark
} from "lucide-react";

interface BankAccount {
  id: number;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  digito?: string;
  tipo: string;
  saldoAtual: number;
  limiteCredito?: number;
  ativo: boolean;
  principal: boolean;
  ultimaConciliacao?: Date;
  empresa: {
    id: number;
    nome: string;
  };
  _count: {
    transactions: number;
    transfersFrom: number;
    transfersTo: number;
  };
}

interface DashboardData {
  resumo: {
    saldoTotal: number;
    limitesTotal: number;
    saldoDisponivel: number;
    totalContas: number;
    totalCreditos: number;
    totalDebitos: number;
    saldoPeriodo: number;
  };
}

export default function BankAccountsPage() {
  const router = useRouter();
  
  const [contas, setContas] = useState<BankAccount[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [ativoFilter, setAtivoFilter] = useState<string>("");
  
  // Modal confirmação exclusão
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; conta?: BankAccount }>({
    show: false
  });
  
  // Empresa (hardcoded por enquanto)
  const empresaId = 1;
  
  useEffect(() => {
    loadData();
  }, [tipoFilter, ativoFilter]);
  
  async function loadData() {
    setLoading(true);
    setError("");
    
    try {
      // Busca contas e dashboard em paralelo
      const [contasRes, dashRes] = await Promise.all([
        fetch(`/api/financeiro/contas?empresaId=${empresaId}${tipoFilter ? `&tipo=${tipoFilter}` : ""}${ativoFilter ? `&ativo=${ativoFilter}` : ""}`),
        fetch(`/api/financeiro/dashboard?empresaId=${empresaId}`)
      ]);
      
      if (!contasRes.ok) throw new Error("Erro ao carregar contas");
      if (!dashRes.ok) throw new Error("Erro ao carregar dashboard");
      
      const contasData = await contasRes.json();
      const dashData = await dashRes.json();
      
      setContas(contasData.data);
      setDashboard(dashData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDelete(conta: BankAccount) {
    try {
      const res = await fetch(`/api/financeiro/contas/${conta.id}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.message || "Erro ao excluir conta");
        return;
      }
      
      alert("Conta excluída com sucesso!");
      setDeleteModal({ show: false });
      loadData();
    } catch (err: any) {
      alert("Erro ao excluir conta: " + err.message);
    }
  }
  
  // Filtra contas pelo termo de busca
  const contasFiltradas = contas.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.banco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.agencia.includes(searchTerm) ||
    c.conta.includes(searchTerm)
  );
  
  // Ícone por tipo de conta
  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "CORRENTE": return <CreditCard className="w-5 h-5" />;
      case "POUPANCA": return <PiggyBank className="w-5 h-5" />;
      case "INVESTIMENTO": return <LineChart className="w-5 h-5" />;
      case "CAIXA": return <Wallet className="w-5 h-5" />;
      case "CARTEIRA_DIGITAL": return <Landmark className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };
  
  // Label do tipo
  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      CORRENTE: "Conta Corrente",
      POUPANCA: "Poupança",
      INVESTIMENTO: "Investimento",
      CAIXA: "Caixa",
      CARTEIRA_DIGITAL: "Carteira Digital"
    };
    return labels[tipo] || tipo;
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-gray-600 mt-1">Gerencie suas contas e movimentações financeiras</p>
        </div>
        
        <button
          onClick={() => router.push("/dashboard/financeiro/contas/nova")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Conta
        </button>
      </div>
      
      {/* Cards de Resumo */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 font-medium">Saldo Total</span>
              <Wallet className="w-6 h-6 text-blue-100" />
            </div>
            <div className="text-3xl font-bold">
              R$ {dashboard.resumo.saldoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-blue-100 text-sm mt-2">{dashboard.resumo.totalContas} conta(s)</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 font-medium">Saldo Disponível</span>
              <CreditCard className="w-6 h-6 text-green-100" />
            </div>
            <div className="text-3xl font-bold">
              R$ {dashboard.resumo.saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-green-100 text-sm mt-2">Com limites</p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-100 font-medium">Créditos (30d)</span>
              <TrendingUp className="w-6 h-6 text-emerald-100" />
            </div>
            <div className="text-3xl font-bold">
              R$ {dashboard.resumo.totalCreditos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-emerald-100 text-sm mt-2">Entradas</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-5 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-100 font-medium">Débitos (30d)</span>
              <TrendingDown className="w-6 h-6 text-red-100" />
            </div>
            <div className="text-3xl font-bold">
              R$ {dashboard.resumo.totalDebitos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-red-100 text-sm mt-2">Saídas</p>
          </div>
        </div>
      )}
      
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome, banco, agência, conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os tipos</option>
            <option value="CORRENTE">Conta Corrente</option>
            <option value="POUPANCA">Poupança</option>
            <option value="INVESTIMENTO">Investimento</option>
            <option value="CAIXA">Caixa</option>
            <option value="CARTEIRA_DIGITAL">Carteira Digital</option>
          </select>
          
          <select
            value={ativoFilter}
            onChange={(e) => setAtivoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
        </div>
      </div>
      
      {/* Lista de Contas */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando contas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      ) : contasFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "Tente ajustar os filtros de busca." : "Comece criando sua primeira conta bancária."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => router.push("/dashboard/financeiro/contas/nova")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Conta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {contasFiltradas.map((conta) => {
            const saldoDisponivel = Number(conta.saldoAtual) + (Number(conta.limiteCredito) || 0);
            const temMovimentacao = conta._count.transactions > 0 || conta._count.transfersFrom > 0 || conta._count.transfersTo > 0;
            
            return (
              <div
                key={conta.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-5 transition-all hover:shadow-md ${
                  conta.principal ? "border-blue-500" : "border-gray-200"
                } ${!conta.ativo ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${conta.ativo ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}>
                      {getTipoIcon(conta.tipo)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{conta.nome}</h3>
                        {conta.principal && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">Principal</span>
                        )}
                        {!conta.ativo && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">Inativa</span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>{conta.banco}</strong> • {getTipoLabel(conta.tipo)}</p>
                        <p>Ag: {conta.agencia} / Conta: {conta.conta}{conta.digito ? `-${conta.digito}` : ""}</p>
                        <p className="flex items-center gap-1">
                          {temMovimentacao ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                          )}
                          <span>{conta._count.transactions} transações • {conta._count.transfersFrom + conta._count.transfersTo} transferências</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Saldo Atual</p>
                      <p className="text-2xl font-bold text-gray-900">
                        R$ {Number(conta.saldoAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    {conta.limiteCredito && Number(conta.limiteCredito) > 0 && (
                      <div className="text-sm text-gray-600">
                        <p>Limite: R$ {Number(conta.limiteCredito).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <p className="font-medium text-green-600">Disponível: R$ {saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push(`/dashboard/financeiro/contas/${conta.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Extrato
                  </button>
                  
                  <button
                    onClick={() => router.push(`/dashboard/financeiro/transferencias/nova?from=${conta.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Transferir
                  </button>
                  
                  <button
                    onClick={() => router.push(`/dashboard/financeiro/contas/${conta.id}/editar`)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  
                  {!temMovimentacao && (
                    <button
                      onClick={() => setDeleteModal({ show: true, conta })}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Modal de Confirmação de Exclusão */}
      {deleteModal.show && deleteModal.conta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir a conta <strong>{deleteModal.conta.nome}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ show: false })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteModal.conta && handleDelete(deleteModal.conta)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
