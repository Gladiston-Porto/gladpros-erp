/**
 * FinanceiroDashboard - Dashboard financeiro do projeto
 * 
 * Exibe:
 * - Cards de métricas (valor estimado, custos previsto/real, margem)
 * - Gráficos EVM (CPI, SPI, VAC, EAC)
 * - Timeline de custos
 * - Progresso visual de orçamento
 * - Indicadores de saúde financeira
 */

'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Target,
  Activity,
} from 'lucide-react';
import { Badge } from "@gladpros/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card";

type Projeto = {
  id: number;
  titulo: string;
  valorEstimado: number | null;
  custoPrevisto: number | null;
  custoReal: number | null;
  Etapas?: Array<{ porcentagem: number }>;
};

type Props = {
  projeto: Projeto;
};

export function FinanceiroDashboard({ projeto }: Props) {
  // Cálculos financeiros
  const financials = useMemo(() => {
    const valorEstimado = projeto.valorEstimado ?? 0;
    const custoPrevisto = projeto.custoPrevisto ?? 0;
    const custoReal = projeto.custoReal ?? 0;
    
    // Calcular progresso baseado nas etapas
    const progressoPercentual = projeto.Etapas && projeto.Etapas.length > 0
      ? projeto.Etapas.reduce((sum, etapa) => sum + Number(etapa.porcentagem), 0) / projeto.Etapas.length
      : 0;

    // Margem prevista e real
    const margemPrevista = custoPrevisto > 0 ? ((valorEstimado - custoPrevisto) / valorEstimado) * 100 : 0;
    const margemReal = custoReal > 0 ? ((valorEstimado - custoReal) / valorEstimado) * 100 : margemPrevista;

    // EVM Metrics (Earned Value Management)
    const PV = (custoPrevisto * progressoPercentual) / 100; // Planned Value
    const AC = custoReal; // Actual Cost
    const EV = (valorEstimado * progressoPercentual) / 100; // Earned Value

    const CPI = AC > 0 ? EV / AC : 1; // Cost Performance Index
    const SPI = PV > 0 ? EV / PV : 1; // Schedule Performance Index
    const CV = EV - AC; // Cost Variance
    const SV = EV - PV; // Schedule Variance

    // Projeções
    const EAC = CPI > 0 ? valorEstimado / CPI : valorEstimado; // Estimate at Completion
    const ETC = EAC - AC; // Estimate to Complete
    const VAC = valorEstimado - EAC; // Variance at Completion

    // Status de saúde
    const overBudget = custoReal > custoPrevisto;
    const healthScore = (CPI + SPI) / 2;
    const healthStatus =
      healthScore >= 0.95
        ? { label: 'Excelente', variant: 'success' as const, color: 'text-green-600' }
        : healthScore >= 0.85
          ? { label: 'Bom', variant: 'primary' as const, color: 'text-blue-600' }
          : healthScore >= 0.75
            ? { label: 'Atenção', variant: 'warning' as const, color: 'text-orange-600' }
            : { label: 'Crítico', variant: 'error' as const, color: 'text-red-600' };

    return {
      valorEstimado,
      custoPrevisto,
      custoReal,
      progressoPercentual,
      margemPrevista,
      margemReal,
      PV,
      AC,
      EV,
      CPI,
      SPI,
      CV,
      SV,
      EAC,
      ETC,
      VAC,
      overBudget,
      healthScore,
      healthStatus,
    };
  }, [projeto]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Indicador de Saúde Financeira */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-blue" />
                Saúde Financeira do Projeto
              </CardTitle>
              <CardDescription>
                Índice baseado em CPI (eficiência de custo) e SPI (eficiência de prazo)
              </CardDescription>
            </div>
            <Badge variant={financials.healthStatus.variant} className="gap-1.5 text-sm">
              {financials.healthStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full transition-all ${
                  financials.healthScore >= 0.95
                    ? 'bg-green-500'
                    : financials.healthScore >= 0.85
                      ? 'bg-blue-500'
                      : financials.healthScore >= 0.75
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(financials.healthScore * 100, 100)}%` }}
              />
            </div>
            <span className={`text-2xl font-bold ${financials.healthStatus.color}`}>
              {(financials.healthScore * 100).toFixed(0)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Valor Estimado */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(financials.valorEstimado)}
            </div>
            <p className="text-xs text-gray-500">Receita prevista do projeto</p>
          </CardContent>
        </Card>

        {/* Custo Previsto */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Previsto</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(financials.custoPrevisto)}
            </div>
            <p className="text-xs text-gray-500">Orçamento planejado</p>
          </CardContent>
        </Card>

        {/* Custo Real */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Real</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                financials.overBudget ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(financials.custoReal)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {financials.overBudget ? (
                <>
                  <ArrowUp className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">Acima do previsto</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Dentro do orçamento</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Margem */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem</CardTitle>
            <TrendingDown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {financials.margemReal.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {financials.margemReal >= financials.margemPrevista ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span>Acima da meta ({financials.margemPrevista.toFixed(1)}%)</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span>Abaixo da meta ({financials.margemPrevista.toFixed(1)}%)</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EVM Metrics */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-blue" />
            Métricas EVM (Earned Value Management)
          </CardTitle>
          <CardDescription>
            Análise de desempenho de custo e prazo do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* CPI - Cost Performance Index */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">CPI (Índice de Desempenho de Custo)</span>
                <Badge
                  variant={financials.CPI >= 1 ? 'success' : financials.CPI >= 0.9 ? 'warning' : 'error'}
                >
                  {financials.CPI.toFixed(2)}
                </Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full transition-all ${
                    financials.CPI >= 1
                      ? 'bg-green-500'
                      : financials.CPI >= 0.9
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(financials.CPI * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {financials.CPI >= 1
                  ? 'Projeto eficiente em custos'
                  : 'Projeto acima do orçamento'}
              </p>
            </div>

            {/* SPI - Schedule Performance Index */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">SPI (Índice de Desempenho de Prazo)</span>
                <Badge
                  variant={financials.SPI >= 1 ? 'success' : financials.SPI >= 0.9 ? 'warning' : 'error'}
                >
                  {financials.SPI.toFixed(2)}
                </Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full transition-all ${
                    financials.SPI >= 1
                      ? 'bg-green-500'
                      : financials.SPI >= 0.9
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(financials.SPI * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {financials.SPI >= 1
                  ? 'Projeto no prazo'
                  : 'Projeto atrasado'}
              </p>
            </div>

            {/* CV - Cost Variance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">CV (Variação de Custo)</span>
                <span
                  className={`text-sm font-bold ${
                    financials.CV >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(financials.CV)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {financials.CV >= 0
                  ? 'Projeto abaixo do orçamento'
                  : 'Projeto acima do orçamento'}
              </p>
            </div>

            {/* VAC - Variance at Completion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">VAC (Variação na Conclusão)</span>
                <span
                  className={`text-sm font-bold ${
                    financials.VAC >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(financials.VAC)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Economia/excesso esperado ao fim do projeto
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projeções Financeiras */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Projeções Financeiras</CardTitle>
          <CardDescription>
            Estimativas de custo final e trabalho restante
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">EAC - Custo Final Estimado</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(financials.EAC)}</p>
              <p className="mt-1 text-xs text-gray-500">Projeção baseada no CPI atual</p>
            </div>

            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">ETC - Custo Restante</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(financials.ETC)}</p>
              <p className="mt-1 text-xs text-gray-500">Estimativa para completar o projeto</p>
            </div>

            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Progresso</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">{financials.progressoPercentual.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-gray-500">Do trabalho planejado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {(financials.overBudget || financials.CPI < 0.9 || financials.SPI < 0.9) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-600" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-orange-900">Atenção Necessária</p>
                <ul className="list-inside list-disc space-y-1 text-orange-700">
                  {financials.overBudget && <li>Projeto está acima do orçamento previsto</li>}
                  {financials.CPI < 0.9 && <li>Índice de desempenho de custo abaixo do ideal (CPI &lt; 0.9)</li>}
                  {financials.SPI < 0.9 && <li>Índice de desempenho de prazo abaixo do ideal (SPI &lt; 0.9)</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
