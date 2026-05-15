'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';
import { Badge } from '@gladpros/ui/badge';
import { Button } from '@gladpros/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gladpros/ui/card';
import { Loading } from '@gladpros/ui/loading';
import { useToast } from '@/shared/hooks/use-toast';

type RiskScore = 'OK' | 'WARNING' | 'ALERT' | 'CRITICAL' | 'LOSS';
type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

type HealthAlert = {
  id: number;
  type: string;
  severity: Exclude<RiskScore, 'OK'>;
  status: AlertStatus;
  metric: string | number | null;
  message: string;
  recommendation: string | null;
  lastDetectedAt: string;
};

type HealthSnapshot = {
  riskScore: RiskScore;
  progressPct: number;
  budgetUsedPct: number;
  actualCost: number;
  estimatedAtCompletion: number;
  projectedMarginPct: number;
  cashGap: number;
  invoiceCoveragePct: number;
  billingCoveragePct: number;
  materialVariance: number;
  laborActualHours: number;
  scheduleVariancePct: number | null;
  recommendations: Array<{
    priority: Exclude<RiskScore, 'OK'>;
    action: string;
    reason: string;
  }>;
  updatedAt: string;
};

type HealthResponse = {
  data: HealthSnapshot;
  success: boolean;
};

type AlertsResponse = {
  data: HealthAlert[];
  success: boolean;
};

const riskTone: Record<RiskScore, { label: string; className: string; badge: string }> = {
  OK: {
    label: 'OK',
    className: 'border-green-500/30 bg-green-500/10 text-green-600',
    badge: 'bg-green-500/10 text-green-600',
  },
  WARNING: {
    label: 'Atenção',
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600',
    badge: 'bg-yellow-500/10 text-yellow-600',
  },
  ALERT: {
    label: 'Alerta',
    className: 'border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary',
    badge: 'bg-brand-secondary/10 text-brand-secondary',
  },
  CRITICAL: {
    label: 'Crítico',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
  LOSS: {
    label: 'Prejuízo',
    className: 'border-destructive bg-destructive/15 text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
};

const alertLabels: Record<string, string> = {
  BUDGET_WARNING: 'Orçamento em atenção',
  BUDGET_LIMIT: 'Limite de orçamento',
  PROJECTED_LOSS: 'Prejuízo projetado',
  LABOR_SLOWDOWN: 'Mão de obra lenta',
  MATERIAL_OVERRUN: 'Material acima do planejado',
  CASH_GAP: 'Cash gap',
  INVOICE_NEEDED: 'Invoice necessária',
  SCHEDULE_RISK: 'Risco de prazo',
  OS_MARGIN_RISK: 'Risco de margem em OS',
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function statusLabel(status: AlertStatus) {
  if (status === 'ACKNOWLEDGED') return 'Reconhecido';
  if (status === 'RESOLVED') return 'Resolvido';
  return 'Aberto';
}

export function ProjectDecisionPanel({ projetoId, userRole }: { projetoId: number; userRole?: string }) {
  // GERENTE sees operational data only — no financial figures (cash gap, margins, coverage)
  const showFinancials = userRole !== 'GERENTE';
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadDecisionData = useCallback(async () => {
    setError(null);
    const [healthRes, alertsRes] = await Promise.all([
      fetch(`/api/projetos/${projetoId}/health`),
      fetch(`/api/projetos/${projetoId}/health/alerts?status=OPEN`),
    ]);

    if (!healthRes.ok || !alertsRes.ok) {
      throw new Error('Não foi possível carregar a saúde do projeto');
    }

    const healthJson = (await healthRes.json()) as HealthResponse;
    const alertsJson = (await alertsRes.json()) as AlertsResponse;
    if (!healthJson.success || !alertsJson.success) {
      throw new Error('Resposta inválida ao carregar a saúde do projeto');
    }
    setSnapshot(healthJson.data);
    setAlerts(alertsJson.data);
  }, [projetoId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadDecisionData()
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Erro ao carregar decisões');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadDecisionData]);

  const primaryRecommendation = useMemo(() => snapshot?.recommendations[0], [snapshot]);

  const syncAlerts = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/projetos/${projetoId}/health/alerts`, { method: 'POST' });
      if (!res.ok) throw new Error('Não foi possível sincronizar alertas');
      await loadDecisionData();
      toast({ title: 'Alertas atualizados', description: 'A saúde do projeto foi recalculada.', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao sincronizar alertas';
      setError(message);
      toast({ title: 'Erro ao sincronizar', description: message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const reloadDecisionData = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadDecisionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar decisões');
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: number, status: AlertStatus) => {
    const res = await fetch(`/api/projetos/${projetoId}/health/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      toast({ title: 'Erro ao atualizar alerta', description: 'Tente novamente em instantes.', variant: 'destructive' });
      return;
    }

    setAlerts((current) => current.filter((alert) => alert.id !== alertId));
    toast({
      title: status === 'RESOLVED' ? 'Alerta resolvido' : 'Alerta reconhecido',
      description: 'O status do alerta foi atualizado.',
      variant: 'success',
    });
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="flex min-h-48 items-center justify-center">
          <Loading text="Carregando saúde do projeto..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-destructive/30 bg-destructive/10 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />
          <div>
            <CardTitle className="text-destructive">Central de decisão indisponível</CardTitle>
            <CardDescription>{error}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void reloadDecisionData()} aria-label="Tentar carregar novamente">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) return null;

  const tone = riskTone[snapshot.riskScore];

  return (
    <section aria-labelledby="project-decision-title" className="space-y-4">
      <Card className={`rounded-2xl border shadow-sm ${tone.className}`}>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Activity className="h-5 w-5" aria-hidden="true" />
              <CardTitle id="project-decision-title" className="font-title">
                Central de decisão do projeto
              </CardTitle>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                {tone.label}
              </span>
            </div>
            <CardDescription className="max-w-3xl">
              Usa dados reais de custo, progresso, OS, materiais, invoices e pagamentos para orientar a próxima ação.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="min-h-12 gap-2 self-start"
            onClick={syncAlerts}
            disabled={syncing}
            aria-label="Recalcular saúde e sincronizar alertas"
          >
            {syncing ? <Loading size="sm" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar alertas
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {primaryRecommendation ? (
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Próxima ação recomendada</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{primaryRecommendation.action}</p>
              <p className="text-sm text-muted-foreground">{primaryRecommendation.reason}</p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-600">
              <CheckCircle2 className="mt-0.5 h-5 w-5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Nenhuma ação crítica agora</p>
                <p className="text-sm">O motor não encontrou risco operacional aberto neste momento.</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {showFinancials && (
              <DecisionMetric icon={<DollarSign className="h-4 w-4" />} label="Cash gap" value={formatCurrency(snapshot.cashGap)} />
            )}
            {showFinancials && (
              <DecisionMetric icon={<TrendingDown className="h-4 w-4" />} label="Margem projetada" value={formatPercent(snapshot.projectedMarginPct)} />
            )}
            {showFinancials && (
              <DecisionMetric icon={<ShieldAlert className="h-4 w-4" />} label="Cobertura faturada" value={formatPercent(snapshot.invoiceCoveragePct)} />
            )}
            <DecisionMetric icon={<Activity className="h-4 w-4" />} label="Orçamento usado" value={formatPercent(snapshot.budgetUsedPct)} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Alertas abertos</CardTitle>
          <CardDescription>
            Cada alerta pode ser reconhecido quando a equipe assumiu a ação, ou resolvido quando o risco foi tratado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
              Nenhum alerta aberto após a última sincronização.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <article key={alert.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={riskTone[alert.severity].badge}>
                          {riskTone[alert.severity].label}
                        </Badge>
                        <Badge variant="secondary">{statusLabel(alert.status)}</Badge>
                        <span className="text-sm font-semibold text-foreground">
                          {alertLabels[alert.type] ?? alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{alert.message}</p>
                      {alert.recommendation && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Ação:</span> {alert.recommendation}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {alert.status === 'OPEN' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-12"
                          onClick={() => void updateAlertStatus(alert.id, 'ACKNOWLEDGED')}
                          aria-label={`Reconhecer alerta ${alertLabels[alert.type] ?? alert.type}`}
                        >
                          Reconhecer
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        className="min-h-12"
                        onClick={() => void updateAlertStatus(alert.id, 'RESOLVED')}
                        aria-label={`Resolver alerta ${alertLabels[alert.type] ?? alert.type}`}
                      >
                        Resolver
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function DecisionMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
