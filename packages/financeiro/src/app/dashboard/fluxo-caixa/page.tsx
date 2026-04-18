"use client";

import { useEffect, useState } from "react";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Calendar, ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";

interface FluxoCaixaData {
  periodo: {
    dataInicio: string;
    dataFim: string;
    dias: number;
  };
  kpis: {
    saldoAtual: number;
    saldoDisponivel: number;
    receitasPeriodo: {
      total: number;
      pagas: number;
      pendentes: number;
      percentualRecebido: number;
    };
    despesasPeriodo: {
      total: number;
      pagas: number;
      pendentes: number;
      percentualPago: number;
    };
    resultadoPeriodo: number;
    resultadoRealizado: number;
    margemLiquida: number;
    burnRate: number;
    runway: number | null;
  };
  evolucaoDiaria: Array<{
    data: string;
    receitas: number;
    despesas: number;
    saldo: number;
    receitasAcumuladas: number;
    despesasAcumuladas: number;
    saldoAcumulado: number;
  }>;
  categorias: {
    receitas: Array<{ categoria: string; total: number }>;
    despesas: Array<{ categoria: string; total: number }>;
  };
  projecoes: {
    periodoProjecao: {
      dataInicio: string;
      dataFim: string;
      dias: number;
    };
    totaisProjetados: {
      receitas: number;
      despesas: number;
      saldoFinal: number;
    };
    evolucaoProjetada: Array<{
      data: string;
      receitasProjetadas: number;
      despesasProjetadas: number;
      saldoProjetado: number;
      receitasAcumuladas: number;
      despesasAcumuladas: number;
      saldoAcumulado: number;
    }>;
    fonteDados: {
      receitasRecorrentes: number;
      despesasRecorrentes: number;
    };
  } | null;
  alertas: Array<{
    tipo: string;
    categoria: string;
    mensagem: string;
    valor?: number;
    quantidade?: number;
    detalhes?: any;
  }>;
}

export default function FluxoCaixaPage() {
  const [data, setData] = useState<FluxoCaixaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState<"7d" | "30d" | "90d" | "12m">("30d");
  const [incluirProjecao, setIncluirProjecao] = useState(true);
  const [diasProjecao, setDiasProjecao] = useState(30);
  const [visualizacao, setVisualizacao] = useState<"diaria" | "acumulada">("diaria");

  // Mock empresaId - em produção viria do contexto/sessão
  const empresaId = 1;

  useEffect(() => {
    fetchFluxoCaixa();
  }, [periodoSelecionado, incluirProjecao, diasProjecao]);

  const fetchFluxoCaixa = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calcula datas baseado no período selecionado
      const hoje = new Date();
      const dataFim = hoje.toISOString().split('T')[0];
      
      let dataInicio: string;
      switch (periodoSelecionado) {
        case "7d":
          dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case "30d":
          dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case "90d":
          dataInicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case "12m":
          dataInicio = new Date(hoje.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
      }

      const params = new URLSearchParams({
        empresaId: empresaId.toString(),
        dataInicio,
        dataFim,
        incluirProjecao: incluirProjecao.toString(),
        diasProjecao: diasProjecao.toString()
      });

      const response = await fetch(`/api/financeiro/fluxo-caixa?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao carregar fluxo de caixa");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "Erro ao carregar dados"}
        </div>
      </div>
    );
  }

  const { kpis, evolucaoDiaria, categorias, projecoes, alertas } = data;

  // Combina dados históricos + projeção para gráfico único
  const dadosGraficoCompleto = [
    ...evolucaoDiaria.map(d => ({
      data: formatDate(d.data),
      receitas: visualizacao === "diaria" ? d.receitas : d.receitasAcumuladas,
      despesas: visualizacao === "diaria" ? d.despesas : d.despesasAcumuladas,
      saldo: visualizacao === "diaria" ? d.saldo : d.saldoAcumulado,
      tipo: "historico" as const
    })),
    ...(projecoes?.evolucaoProjetada.map(p => ({
      data: formatDate(p.data),
      receitas: visualizacao === "diaria" ? p.receitasProjetadas : p.receitasAcumuladas,
      despesas: visualizacao === "diaria" ? p.despesasProjetadas : p.despesasAcumuladas,
      saldo: visualizacao === "diaria" ? p.saldoProjetado : p.saldoAcumulado,
      tipo: "projecao" as const
    })) || [])
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fluxo de Caixa</h1>
          <p className="text-gray-600 mt-1">
            Análise financeira de {formatDate(data.periodo.dataInicio)} até {formatDate(data.periodo.dataFim)}
          </p>
        </div>
        
        <div className="flex gap-3">
          {/* Seletor de Período */}
          <select
            value={periodoSelecionado}
            onChange={(e) => setPeriodoSelecionado(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="12m">Últimos 12 meses</option>
          </select>

          {/* Seletor Visualização */}
          <select
            value={visualizacao}
            onChange={(e) => setVisualizacao(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="diaria">Valores Diários</option>
            <option value="acumulada">Valores Acumulados</option>
          </select>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, index) => {
            const bgColor = alerta.tipo === "CRITICO" ? "bg-red-50 border-red-200 text-red-800" :
                           alerta.tipo === "URGENTE" ? "bg-orange-50 border-orange-200 text-orange-800" :
                           "bg-yellow-50 border-yellow-200 text-yellow-800";
            
            return (
              <div key={index} className={`flex items-start gap-3 p-4 border rounded-lg ${bgColor}`}>
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{alerta.mensagem}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Saldo Atual */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-blue-100 text-sm font-medium">Saldo Atual</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(kpis.saldoAtual)}</p>
          <p className="text-blue-100 text-xs mt-2">
            Disponível: {formatCurrency(kpis.saldoDisponivel)}
          </p>
        </div>

        {/* Receitas do Período */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <ArrowUpRight className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-green-100 text-sm font-medium">Receitas Período</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(kpis.receitasPeriodo.total)}</p>
          <p className="text-green-100 text-xs mt-2">
            Recebido: {kpis.receitasPeriodo.percentualRecebido.toFixed(1)}% 
            ({formatCurrency(kpis.receitasPeriodo.pagas)})
          </p>
        </div>

        {/* Despesas do Período */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8 opacity-80" />
            <ArrowDownRight className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-red-100 text-sm font-medium">Despesas Período</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(kpis.despesasPeriodo.total)}</p>
          <p className="text-red-100 text-xs mt-2">
            Pago: {kpis.despesasPeriodo.percentualPago.toFixed(1)}%
            ({formatCurrency(kpis.despesasPeriodo.pagas)})
          </p>
        </div>

        {/* Resultado do Período */}
        <div className={`bg-gradient-to-br ${kpis.resultadoPeriodo >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600'} text-white p-6 rounded-xl shadow-lg`}>
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 opacity-80" />
            {kpis.resultadoPeriodo >= 0 ? (
              <TrendingUp className="w-6 h-6 opacity-60" />
            ) : (
              <TrendingDown className="w-6 h-6 opacity-60" />
            )}
          </div>
          <p className={`${kpis.resultadoPeriodo >= 0 ? 'text-emerald-100' : 'text-orange-100'} text-sm font-medium`}>
            Resultado Período
          </p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(kpis.resultadoPeriodo)}</p>
          <p className={`${kpis.resultadoPeriodo >= 0 ? 'text-emerald-100' : 'text-orange-100'} text-xs mt-2`}>
            Margem: {kpis.margemLiquida.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Métricas Avançadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Burn Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(kpis.burnRate)}/dia
          </p>
          <p className="text-gray-500 text-xs mt-1">Média de gastos diários</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Runway</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpis.runway !== null ? `${kpis.runway} dias` : "∞"}
          </p>
          <p className="text-gray-500 text-xs mt-1">Tempo até saldo zero</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Resultado Realizado</p>
          <p className={`text-2xl font-bold mt-2 ${kpis.resultadoRealizado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(kpis.resultadoRealizado)}
          </p>
          <p className="text-gray-500 text-xs mt-1">Receitas pagas - Despesas pagas</p>
        </div>
      </div>

      {/* Gráfico Principal: Evolução Temporal */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Evolução Financeira {visualizacao === "acumulada" && "(Acumulado)"}
        </h2>
        
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={dadosGraficoCompleto}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="receitas" 
              stackId="1"
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.6}
              name="Receitas"
            />
            <Area 
              type="monotone" 
              dataKey="despesas" 
              stackId="2"
              stroke="#ef4444" 
              fill="#ef4444" 
              fillOpacity={0.6}
              name="Despesas"
            />
            <Line 
              type="monotone" 
              dataKey="saldo" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 1 }}
              name="Saldo"
            />
          </AreaChart>
        </ResponsiveContainer>

        {projecoes && (
          <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Projeção baseada em {projecoes.fonteDados.receitasRecorrentes} receitas e {projecoes.fonteDados.despesasRecorrentes} despesas recorrentes
            • Saldo projetado em {projecoes.periodoProjecao.dias} dias: <strong className={projecoes.totaisProjetados.saldoFinal >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(projecoes.totaisProjetados.saldoFinal)}
            </strong>
          </p>
        )}
      </div>

      {/* Gráficos de Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Receitas por Categoria */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Receitas por Categoria</h2>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categorias.receitas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#10b981" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Despesas por Categoria */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Despesas por Categoria</h2>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categorias.despesas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#ef4444" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controles de Projeção */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Configurações de Projeção</h2>
        
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={incluirProjecao}
              onChange={(e) => setIncluirProjecao(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700">Incluir projeção no gráfico</span>
          </label>

          {incluirProjecao && (
            <div className="flex items-center gap-2">
              <label className="text-gray-700">Dias de projeção:</label>
              <input
                type="number"
                value={diasProjecao}
                onChange={(e) => setDiasProjecao(Number(e.target.value))}
                min={7}
                max={90}
                className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
