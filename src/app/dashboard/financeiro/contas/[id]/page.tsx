"use client";

/**
 * PÁGINA - DETALHES E EXTRATO DA CONTA BANCÁRIA
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter
} from "lucide-react";

interface BankTransaction {
  id: number;
  tipo: string;
  valor: number;
  descricao: string;
  dataTransacao: string;
  saldoPosterior: number;
  categoria?: string;
  reconciliada: boolean;
}

export default function BankAccountDetailsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const router = useRouter();
  const [conta, setConta] = useState<any>(null);
  const [extrato, setExtrato] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [tipoFilter, setTipoFilter] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    paramsPromise.then(setResolvedParams);
  }, [paramsPromise]);
  
  useEffect(() => {
    if (resolvedParams) loadData();
  }, [resolvedParams, tipoFilter, dataInicio, dataFim]);
  
  async function loadData() {
    if (!resolvedParams) return;
    setLoading(true);
    try {
      const [contaRes, extratoRes] = await Promise.all([
        fetch(`/api/financeiro/contas/${resolvedParams.id}`),
        fetch(`/api/financeiro/contas/${resolvedParams.id}/extrato?${new URLSearchParams({
          ...(tipoFilter && { tipo: tipoFilter }),
          ...(dataInicio && { dataInicio }),
          ...(dataFim && { dataFim })
        })}`)
      ]);
      
      const contaData = await contaRes.json();
      const extratoData = await extratoRes.json();
      
      setConta(contaData.data);
      setExtrato(extratoData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }
  
  if (!conta || !extrato) {
    return <div className="p-6">Conta não encontrada</div>;
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </button>
      
      <div className="bg-card rounded-2xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{conta.nome}</h1>
        <p className="text-muted-foreground">{conta.banco} • Ag: {conta.agencia} / Conta: {conta.conta}</p>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className="text-2xl font-bold">$ {Number(conta.saldoAtual).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Créditos</p>
            <p className="text-xl text-green-600 flex items-center gap-1">
              <TrendingUp className="w-5 h-5" />
              $ {extrato.resumo.totalCreditos.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Débitos</p>
            <p className="text-xl text-red-600 flex items-center gap-1">
              <TrendingDown className="w-5 h-5" />
              $ {extrato.resumo.totalDebitos.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="bg-card rounded-2xl shadow-sm p-4 mb-6 flex gap-4">
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="px-4 py-2 border rounded-2xl"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos os tipos</option>
          <option value="CREDITO">Crédito</option>
          <option value="DEBITO">Débito</option>
          <option value="TRANSFERENCIA_ENTRADA">Transf. Entrada</option>
          <option value="TRANSFERENCIA_SAIDA">Transf. Saída</option>
        </select>
        
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="px-4 py-2 border rounded-2xl"
          aria-label="Data início"
        />
        
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="px-4 py-2 border rounded-2xl"
          aria-label="Data fim"
        />
      </div>
      
      {/* Lista de Transações */}
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {extrato.transacoes.map((t: BankTransaction) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-foreground">
                    {new Date(t.dataTransacao).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-foreground">{t.descricao}</p>
                    {t.categoria && <p className="text-muted-foreground">{t.categoria}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${
                      t.tipo.includes("CREDITO") || t.tipo.includes("ENTRADA")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {t.tipo}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    t.tipo.includes("CREDITO") || t.tipo.includes("ENTRADA")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {t.tipo.includes("CREDITO") || t.tipo.includes("ENTRADA") ? "+" : "-"}
                    $ {Number(t.valor).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                    $ {Number(t.saldoPosterior).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {extrato.transacoes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        )}
      </div>
    </div>
  );
}
