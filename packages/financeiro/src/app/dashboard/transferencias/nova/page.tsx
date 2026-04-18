"use client";

/**
 * PÁGINA - NOVA TRANSFERÊNCIA BANCÁRIA
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

interface BankAccount {
  id: number;
  nome: string;
  banco: string;
  saldoAtual: number;
  limiteCredito?: number;
}

export default function NewTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [contas, setContas] = useState<BankAccount[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const empresaId = 1;
  
  useEffect(() => {
    loadContas();
    
    // Se veio com conta pré-selecionada
    const from = searchParams.get("from");
    if (from) setFromAccountId(from);
  }, []);
  
  async function loadContas() {
    try {
      const res = await fetch(`/api/financeiro/contas?empresaId=${empresaId}&ativo=true`);
      const data = await res.json();
      setContas(data.data);
    } catch (err) {
      console.error(err);
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/financeiro/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          fromAccountId: Number(fromAccountId),
          toAccountId: Number(toAccountId),
          valor: parseFloat(valor),
          descricao,
          observacoes
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Erro ao realizar transferência");
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/financeiro/contas");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  const contaOrigem = contas.find(c => c.id === Number(fromAccountId));
  const contaDestino = contas.find(c => c.id === Number(toAccountId));
  
  const saldoDisponivel = contaOrigem
    ? Number(contaOrigem.saldoAtual) + (Number(contaOrigem.limiteCredito) || 0)
    : 0;
  
  const valorNumerico = parseFloat(valor) || 0;
  const temSaldo = valorNumerico > 0 && valorNumerico <= saldoDisponivel;
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </button>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Nova Transferência</h1>
        
        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">Transferência realizada com sucesso!</h3>
            <p className="text-green-700">Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Conta de Origem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conta de Origem *
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione a conta</option>
                {contas.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} - {c.banco} (R$ {Number(c.saldoAtual).toFixed(2)})
                  </option>
                ))}
              </select>
              
              {contaOrigem && (
                <p className="mt-2 text-sm text-gray-600">
                  Saldo disponível: <span className="font-medium">R$ {saldoDisponivel.toFixed(2)}</span>
                </p>
              )}
            </div>
            
            {/* Seta Visual */}
            {contaOrigem && (
              <div className="flex justify-center">
                <ArrowRight className="w-8 h-8 text-blue-500" />
              </div>
            )}
            
            {/* Conta de Destino */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conta de Destino *
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione a conta</option>
                {contas.filter(c => c.id !== Number(fromAccountId)).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} - {c.banco}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              
              {valorNumerico > 0 && !temSaldo && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Saldo insuficiente
                </p>
              )}
            </div>
            
            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição *
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                maxLength={255}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Motivo da transferência"
              />
            </div>
            
            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Informações adicionais (opcional)"
              />
            </div>
            
            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}
            
            {/* Resumo */}
            {contaOrigem && contaDestino && valorNumerico > 0 && temSaldo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Resumo da Transferência</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>De: <strong>{contaOrigem.nome}</strong></p>
                  <p>Para: <strong>{contaDestino.nome}</strong></p>
                  <p>Valor: <strong>R$ {valorNumerico.toFixed(2)}</strong></p>
                  <p>Novo saldo origem: <strong>R$ {(Number(contaOrigem.saldoAtual) - valorNumerico).toFixed(2)}</strong></p>
                  <p>Novo saldo destino: <strong>R$ {(Number(contaDestino.saldoAtual) + valorNumerico).toFixed(2)}</strong></p>
                </div>
              </div>
            )}
            
            {/* Botões */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !temSaldo}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {loading ? "Processando..." : "Realizar Transferência"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
