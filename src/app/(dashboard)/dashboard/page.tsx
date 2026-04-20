'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { StatCard } from "@gladpros/ui/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@gladpros/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@gladpros/ui/card";
import { Shield, Clock, Users, FileText, Target, LayoutDashboard } from 'lucide-react';
import { UserMetricsChart, RoleDistributionChart, SecurityMetricsChart } from '@/components/charts/DashboardCharts';
import { useDashboardData } from '@/shared/hooks/useDashboardData';

const DashboardStats = lazy(() => import('@/components/dashboard').then(m => ({ default: m.DashboardStats })));
const RecentActivity  = lazy(() => import('@/components/dashboard').then(m => ({ default: m.RecentActivity })));
const QuickActions    = lazy(() => import('@/components/dashboard').then(m => ({ default: m.QuickActions })));
const SystemStatus    = lazy(() => import('@/components/dashboard').then(m => ({ default: m.SystemStatus })));
const ExecutiveTab    = lazy(() => import('@/components/dashboard/ExecutiveTab'));

function Skel({ h = 'h-32' }: { h?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${h}`} />;
}

const PERIOD_LABELS: Record<'7d' | '30d' | '90d', string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
};

function healthVariant(h: string): 'success' | 'warning' | 'error' {
  if (h === 'good')    return 'success';
  if (h === 'warning') return 'warning';
  return 'error';
}
function healthText(h: string) {
  if (h === 'good')    return 'Sistema saudável';
  if (h === 'warning') return 'Atenção necessária';
  return 'Problemas detectados';
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'executive' | 'overview' | 'roles' | 'security'>('executive');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [executiveEnabled, setExecutiveEnabled]  = useState(false);

  useEffect(() => {
    if (activeTab !== 'executive') { setAnalyticsEnabled(true); return; }
    const id = 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => setAnalyticsEnabled(true), { timeout: 1500 })
      : setTimeout(() => setAnalyticsEnabled(true), 1200);
    return () => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id as number);
      else clearTimeout(id as ReturnType<typeof setTimeout>);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'executive') { setExecutiveEnabled(false); return; }
    const id = 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => setExecutiveEnabled(true), { timeout: 1200 })
      : setTimeout(() => setExecutiveEnabled(true), 800);
    return () => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id as number);
      else clearTimeout(id as ReturnType<typeof setTimeout>);
    };
  }, [activeTab]);

  const {
    stats, roles, recentActivities,
    roleChartData, userMetricsData, loginChartData,
    loading, period, setPeriod, userRole, setUserRole, refetch,
  } = useDashboardData({ enabled: analyticsEnabled });

  const hv = healthVariant(stats?.systemHealth || 'good');

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <ModulePageHeader
        title="Dashboard"
        description="Visão executiva de operações, vendas e segurança"
        icon={<LayoutDashboard />}
        accentColor="var(--color-brand-primary)"
        breadcrumbs={[{ label: 'Dashboard' }]}
        badges={
          <Badge variant={hv} className="text-xs">
            {healthText(stats?.systemHealth || 'good')}
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={refetch}>
            Atualizar
          </Button>
        }
      />

      {/* ── Filtros compactos ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={(v: '7d' | '30d' | '90d') => setPeriod(v)}>
          <SelectTrigger className="h-8 w-[160px] text-xs rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={userRole} onValueChange={setUserRole}>
          <SelectTrigger className="h-8 w-[160px] text-xs rounded-2xl">
            <SelectValue placeholder="Todas as funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="GERENTE">Gerente</SelectItem>
            <SelectItem value="USUARIO">Usuário</SelectItem>
          </SelectContent>
        </Select>

        {loading && analyticsEnabled && (
          <span className="text-[11px] text-muted-foreground animate-pulse">Carregando…</span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">{PERIOD_LABELS[period]}</span>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Usuários Ativos"
          value={stats?.activeUsers ?? 0}
          description={`${stats?.totalUsers ?? 0} cadastrados`}
          icon={<Users />}
          variant="default"
        />
        <StatCard
          title="Propostas no Período"
          value={stats?.totalProposals ?? 0}
          description={`${stats?.propostasAprovadas ?? 0} aprovadas`}
          icon={<FileText />}
          variant="income"
        />
        <StatCard
          title="Clientes Ativos"
          value={stats?.totalClients ?? 0}
          icon={<Target />}
          variant="orange"
        />
        <StatCard
          title="Tentativas de Login"
          value={stats?.loginAttempts ?? 0}
          description={`${stats?.failedLogins ?? 0} falhas`}
          icon={<Shield />}
          variant={stats?.failedLogins ? 'warning' : 'muted'}
        />
      </div>

      {/* ── Stats de propostas ───────────────────────────────────────── */}
      <Suspense fallback={<Skel />}>
        <DashboardStats
          stats={{
            totalPropostas:     stats?.totalProposals    ?? 0,
            propostasAprovadas: stats?.propostasAprovadas ?? 0,
            propostasPendentes: stats?.propostasPendentes ?? 0,
            totalClientes:      stats?.totalClients      ?? 0,
          }}
        />
      </Suspense>

      {/* ── Ações rápidas + Status do sistema ───────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skel h="h-48" />}>
          <QuickActions
            onNewProposal={() => router.push('/propostas/nova')}
            onNewClient={()   => router.push('/clientes/novo')}
            onViewReports={()  => router.push('/relatorios')}
            onSettings={()    => router.push('/configuracoes')}
          />
        </Suspense>
        <Suspense fallback={<Skel h="h-48" />}>
          <SystemStatus
            database="online"
            api="online"
            lastBackup={
              stats?.lastActivityAt
                ? new Date(stats.lastActivityAt).toLocaleString('en-US', {
                    timeZone: 'America/Chicago',
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : 'N/A'
            }
            uptime="Ativo"
          />
        </Suspense>
      </div>

      <Suspense fallback={<Skel h="h-40" />}>
        <RecentActivity activities={recentActivities} />
      </Suspense>

      {/* ── Tabs de análise ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList className="h-9">
          <TabsTrigger value="executive" className="text-xs">Executivo</TabsTrigger>
          <TabsTrigger value="overview"  className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="roles"     className="text-xs">Por Função</TabsTrigger>
          <TabsTrigger value="security"  className="text-xs">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="mt-4">
          <Suspense fallback={<Skel />}>
            {executiveEnabled ? <ExecutiveTab period={period} enabled={executiveEnabled} /> : <Skel />}
          </Suspense>
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Performance</CardTitle>
              <CardDescription>
                Métricas de uso nos últimos {period === '7d' ? '7' : period === '30d' ? '30' : '90'} dias
              </CardDescription>
            </CardHeader>
            <CardContent><UserMetricsChart data={userMetricsData} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {roles.map(role => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm">
                    {role.name}
                    <Badge variant="secondary">{role.userCount} usuários</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-xs text-muted-foreground">Permissões:</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map(p => (
                      <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Distribuição de Funções</CardTitle></CardHeader>
            <CardContent><RoleDistributionChart data={roleChartData} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Relatório de Segurança</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <Shield className="size-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Sistema Seguro</p>
                    <p className="text-xs text-muted-foreground">Nenhuma vulnerabilidade crítica</p>
                  </div>
                </div>
                <Badge variant="success">OK</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-[#0098DA]" />
                  <div>
                    <p className="text-sm font-medium">Auditoria Ativa</p>
                    <p className="text-xs text-muted-foreground">Monitoramento contínuo</p>
                  </div>
                </div>
                <Badge variant="info">Ativo</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Métricas de Segurança</CardTitle></CardHeader>
            <CardContent><SecurityMetricsChart data={loginChartData} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
