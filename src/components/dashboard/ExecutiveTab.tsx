// src/components/dashboard/ExecutiveTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card";
import { FinanceCard } from "@gladpros/ui/finance-card";
import { PageHeader } from "@gladpros/ui/page-header";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Users,
  Package,
  FileText,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface ExecutiveKPIs {
  // Financeiro
  receitaTotal: number;
  despesaTotal: number;
  saldoPeriodo: number;
  saldoContas: number;
  crescimentoReceita: number;

  // Projetos
  projetosAtivos: number;
  projetosAtrasados: number;
  projetosSobreOrcamento: number;

  // Workforce
  workersAtivos: number;

  // Clientes & Propostas
  clientesAtivos: number;
  propostasTotal: number;
  propostasAprovadas: number;
  propostasPendentes: number;

  // Estoque
  produtosTotal: number;
  estoqueTotal: number;
  movimentacoesRecentes: number;

  // Invoices
  invoicesTotal: number;
  invoicesFaturamento: number;
}

interface Projeto {
  id: string;
  nome: string;
  status: string;
  prioridade: string;
  health: 'good' | 'neutral' | 'critical';
  custoAtual: number | null;
  orcamento: number | null;
}

interface Alerta {
  tipo: string;
  severidade: 'low' | 'medium' | 'high';
  mensagem: string;
  count?: number;
  valor?: number;
}

interface ExecutiveData {
  period: string;
  kpis: ExecutiveKPIs;
  projetos: Projeto[];
  alertas: Alerta[];
}

interface ExecutiveTabProps {
  period: '7d' | '30d' | '90d';
  enabled?: boolean;
}

const PERIOD_LABELS: Record<ExecutiveTabProps['period'], string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const getStatusBadge = (status: string) => {
  if (status.includes('ANDAMENTO')) return 'default';
  if (status.includes('PLANEJAMENTO')) return 'secondary';
  if (status.includes('CANCELADO')) return 'destructive';
  if (status.includes('CONCLUIDO')) return 'secondary';
  return 'outline';
};

const getPriorityBadge = (priority: string) => {
  if (priority === 'ALTA') return 'destructive';
  if (priority === 'MEDIA') return 'secondary';
  return 'default';
};

export default function ExecutiveTab({ period, enabled = true }: ExecutiveTabProps) {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/dashboard/executive?period=${period}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar dados');
        }

        const json = await response.json();
        if (controller.signal.aborted) return;
        setData(json.data ?? json);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('Erro ao carregar dashboard executivo:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [enabled, period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Não foi possível carregar os dados'}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { kpis, projetos, alertas } = data;

  // Calcular taxa de conversão de propostas
  const taxaConversao = kpis.propostasTotal > 0
    ? ((kpis.propostasAprovadas / kpis.propostasTotal) * 100).toFixed(1)
    : '0';

  // Determinar health do financeiro
  const financeiroHealth = kpis.saldoPeriodo >= 0 ? 'positive' : 'negative';

  const saldoTrend = kpis.crescimentoReceita > 0 ? 'up' : kpis.crescimentoReceita < 0 ? 'down' : 'neutral';

  const heroHighlights = [
    {
      label: 'Saldo Líquido',
      value: formatCurrency(kpis.saldoPeriodo),
      detail: 'Disponível em caixa consolidado',
    },
    {
      label: 'Receita Total',
      value: formatCurrency(kpis.receitaTotal),
      detail: `${kpis.crescimentoReceita >= 0 ? '+' : ''}${kpis.crescimentoReceita.toFixed(1)}% vs período anterior`,
    },
    {
      label: 'Clientes Ativos',
      value: kpis.clientesAtivos.toString(),
      detail: `${kpis.propostasTotal} propostas • ${taxaConversao}% conversão`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Executivo"
        description="Resumo consolidado dos KPIs financeiros, operacionais e de pessoas para a alta liderança."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Período: {PERIOD_LABELS[period]}
            </Badge>
            <Link href="/relatorios/executivo">
              <Button variant="outline" size="sm">
                Ver relatório
              </Button>
            </Link>
          </div>
        }
      />

      <div
        className="rounded-2xl border border-white/30 bg-hero-gradient p-6 text-white shadow-lg"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/80">Resumo executivo</p>
            <h2 className="mt-3 text-2xl font-semibold">Indicadores prioritários</h2>
            <p className="text-sm text-white/80">
              Os dados abaixo orientam decisões imediatas sobre caixa, equipe e pipeline de propostas.
            </p>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {PERIOD_LABELS[period]}
          </Badge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {heroHighlights.map((highlight) => (
            <div
              key={highlight.label}
              className="rounded-xl border border-white/30 bg-white/20 p-4 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-white/80">{highlight.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{highlight.value}</p>
              <p className="text-sm text-white/80">{highlight.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FinanceCard
          title="Saldo Período"
          value={kpis.saldoPeriodo}
          change={kpis.crescimentoReceita}
          trend={saldoTrend}
          icon={<DollarSign className="h-5 w-5" />}
          variant={financeiroHealth === 'positive' ? 'income' : 'expense'}
          description="Saldo consolidado em todas as contas"
        />
        <FinanceCard
          title="Receita Total"
          value={kpis.receitaTotal}
          change={kpis.crescimentoReceita}
          trend={kpis.crescimentoReceita > 0 ? 'up' : kpis.crescimentoReceita < 0 ? 'down' : 'neutral'}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="income"
          description="Arrecadação no período selecionado"
        />
        <FinanceCard
          title="Despesas Totais"
          value={kpis.despesaTotal}
          trend="down"
          icon={<TrendingDown className="h-5 w-5" />}
          variant="expense"
          description="Pagamentos e compromissos realizados"
        />
      </div>

      {alertas.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Alertas ({alertas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertas.map((alerta, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-lg ${alerta.severidade === 'high' ? 'bg-red-50 border border-red-200' :
                    alerta.severidade === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                >
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${alerta.severidade === 'high' ? 'text-red-500' :
                    alerta.severidade === 'medium' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                  <div className="flex-1">
                    <p className={`font-medium ${alerta.severidade === 'high' ? 'text-red-800' :
                      alerta.severidade === 'medium' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                      {alerta.mensagem}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tipo: {alerta.tipo.toUpperCase()}
                    </p>
                  </div>
                  <Badge variant={
                    alerta.severidade === 'high' ? 'destructive' :
                      alerta.severidade === 'medium' ? 'secondary' :
                        'default'
                  }>
                    {alerta.severidade === 'high' ? 'Alto' :
                      alerta.severidade === 'medium' ? 'Médio' :
                        'Baixo'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Projetos */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Projetos Ativos</p>
              <Briefcase className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{kpis.projetosAtivos}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs">
              {kpis.projetosAtrasados > 0 && (
                <span className="flex items-center text-red-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {kpis.projetosAtrasados} atrasado(s)
                </span>
              )}
              {kpis.projetosSobreOrcamento > 0 && (
                <span className="flex items-center text-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {kpis.projetosSobreOrcamento} sobre orçamento
                </span>
              )}
              {kpis.projetosAtrasados === 0 && kpis.projetosSobreOrcamento === 0 && (
                <span className="flex items-center text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Tudo OK
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RH */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Workers Ativos</p>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{kpis.workersAtivos}</p>
          </CardContent>
        </Card>

        {/* Estoque */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Estoque Total</p>
              <Package className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{kpis.produtosTotal}</p>
            <p className="text-xs text-gray-500 mt-1">
              {kpis.estoqueTotal} unidade(s) • {kpis.movimentacoesRecentes} movimentação(ões) recentes
            </p>
          </CardContent>
        </Card>

        {/* Propostas */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Propostas</p>
              <FileText className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold">{kpis.propostasTotal}</p>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-green-600">{kpis.propostasAprovadas} aprovada(s)</span>
              <span className="text-gray-500">Taxa: {taxaConversao}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Clientes */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Clientes Ativos</p>
              <Users className="h-4 w-4 text-teal-500" />
            </div>
            <p className="text-2xl font-bold">{kpis.clientesAtivos}</p>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Faturamento (Invoices)</p>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(kpis.invoicesFaturamento)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {kpis.invoicesTotal} invoice(s) no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projetos Críticos */}
      {projetos.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Projetos em Andamento</CardTitle>
              <CardDescription>
                {projetos.length} projeto(s) ativo(s)
              </CardDescription>
            </div>
            <Link href="/projetos">
              <Button variant="ghost" size="sm">
                Ver Todos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projetos.slice(0, 5).map((projeto) => (
                <div
                  key={projeto.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <Link href={`/projetos/${projeto.id}`} className="hover:underline">
                      <p className="font-medium">{projeto.nome}</p>
                    </Link>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={getStatusBadge(projeto.status)} className="text-xs">
                        {projeto.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getPriorityBadge(projeto.prioridade)} className="text-xs">
                        {projeto.prioridade}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    {projeto.orcamento && projeto.custoAtual !== null && (
                      <>
                        <p className="text-sm font-medium">
                          {formatCurrency(projeto.custoAtual)}
                        </p>
                        <p className="text-xs text-gray-500">
                          de {formatCurrency(projeto.orcamento)}
                        </p>
                      </>
                    )}
                    {projeto.health === 'critical' && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        Sobre Orçamento
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Links Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>Navegue para os módulos principais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/dashboard/financeiro">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Financeiro
              </Button>
            </Link>
            <Link href="/projetos">
              <Button variant="outline" className="w-full justify-start">
                <Briefcase className="h-4 w-4 mr-2" />
                Projetos
              </Button>
            </Link>
            <Link href="/rh">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                RH
              </Button>
            </Link>
            <Link href="/estoque">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Estoque
              </Button>
            </Link>
            <Link href="/propostas">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Propostas
              </Button>
            </Link>
            <Link href="/clientes">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Clientes
              </Button>
            </Link>
            <Link href="/invoices">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Invoices
              </Button>
            </Link>
            <Link href="/estoque">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Materiais
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
