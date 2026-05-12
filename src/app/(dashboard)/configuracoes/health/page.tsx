'use client';

import { useEffect, useState, useCallback } from 'react';
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { Card, CardContent } from '@gladpros/ui/card';
import { Button } from '@gladpros/ui/button';
import { Badge } from '@gladpros/ui/badge';
import {
  Activity,
  Database,
  HardDrive,
  Mail,
  RefreshCw,
  Server,
  Users,
  FileText,
  Receipt,
  Zap,
  Clock,
} from 'lucide-react';

interface ServiceCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: { usedMb: number; totalMb: number };
  services: {
    database: ServiceCheck;
    cache: ServiceCheck;
    email: ServiceCheck;
  };
}

interface MetricsData {
  users: { total: number; active: number };
  clientes: { total: number };
  propostas: { total: number };
  invoices: { total: number; pagas: number };
  events: { total: number; today: number; failed: number };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusDot({ status }: { status: ServiceCheck['status'] }) {
  const colors = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    unhealthy: 'bg-red-500',
  };
  return (
    <span className="relative flex h-3 w-3">
      {status === 'healthy' && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colors[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${colors[status]}`} />
    </span>
  );
}

function StatusBadge({ status }: { status: ServiceCheck['status'] }) {
  const map = {
    healthy: { label: 'Saudável', variant: 'success' as const },
    degraded: { label: 'Degradado', variant: 'warning' as const },
    unhealthy: { label: 'Fora do ar', variant: 'error' as const },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, mRes] = await Promise.all([
        fetch('/api/monitoring/health'),
        fetch('/api/monitoring/metrics'),
      ]);
      if (hRes.ok) setHealth(await hRes.json());
      if (mRes.ok) setMetrics(await mRes.json());
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Erro ao buscar dados de saúde:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const serviceIcons: Record<string, React.ReactNode> = {
    database: <Database className="h-5 w-5" />,
    cache: <HardDrive className="h-5 w-5" />,
    email: <Mail className="h-5 w-5" />,
  };

  const serviceLabels: Record<string, string> = {
    database: 'Banco de Dados (MySQL)',
    cache: 'Cache (Redis)',
    email: 'Serviço de Email (SMTP)',
  };

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title="Saúde do Sistema"
        description="Monitoramento em tempo real dos serviços e infraestrutura."
        icon={<Activity />}
        accentColor="#06b6d4"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Saúde do Sistema' },
        ]}
      />

      {/* Status geral + controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {health && (
            <>
              <StatusDot status={health.status} />
              <span className="text-sm font-medium">
                Sistema {health.status === 'healthy' ? 'operacional' : health.status === 'degraded' ? 'degradado' : 'com problemas'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Atualizado {lastRefresh.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Serviços */}
      <div className="grid gap-4 sm:grid-cols-3">
        {health &&
          Object.entries(health.services).map(([key, svc]) => (
            <Card key={key}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {serviceIcons[key]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{serviceLabels[key]}</p>
                      {svc.latencyMs !== undefined && (
                        <p className="text-xs text-muted-foreground">{svc.latencyMs}ms latência</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={svc.status} />
                </div>
                {svc.error && (
                  <p className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{svc.error}</p>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Infraestrutura */}
      {health && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Uptime</p>
                <p className="text-lg font-bold">{formatUptime(health.uptime)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Memória</p>
                <p className="text-lg font-bold">
                  {health.memory.usedMb} <span className="text-sm font-normal text-muted-foreground">/ {health.memory.totalMb} MB</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Uso de memória</p>
                <p className="text-lg font-bold">
                  {Math.round((health.memory.usedMb / health.memory.totalMb) * 100)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Métricas do negócio */}
      {metrics && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Métricas do Sistema</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Usuários ativos', value: metrics.users.active, total: metrics.users.total, icon: <Users className="h-4 w-4" /> },
              { label: 'Clientes ativos', value: metrics.clientes.total, icon: <Users className="h-4 w-4" /> },
              { label: 'Propostas', value: metrics.propostas.total, icon: <FileText className="h-4 w-4" /> },
              { label: 'Invoices pagas', value: metrics.invoices.pagas, total: metrics.invoices.total, icon: <Receipt className="h-4 w-4" /> },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {m.icon}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-bold">
                      {m.value}
                      {m.total !== undefined && (
                        <span className="text-sm font-normal text-muted-foreground"> / {m.total}</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Eventos */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Eventos hoje</p>
                <p className="text-2xl font-bold">{metrics.events.today}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total de eventos</p>
                <p className="text-2xl font-bold">{metrics.events.total.toLocaleString('en-US')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Eventos com falha</p>
                <p className={`text-2xl font-bold ${metrics.events.failed > 0 ? 'text-red-600' : ''}`}>
                  {metrics.events.failed}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
