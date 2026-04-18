'use client';

import { useState, useEffect, useCallback } from 'react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProposals: number;
  propostasAprovadas: number;
  propostasPendentes: number;
  totalClients: number;
  loginAttempts: number;
  failedLogins: number;
  auditEvents: number;
  systemHealth: 'good' | 'warning' | 'error';
  lastActivityAt: string | null;
}

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  userCount: number;
}

type ActivityType = 'nova_proposta' | 'aprovacao' | 'cancelamento' | 'novo_cliente';

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  user?: string;
}

interface RoleChartEntry { name: string; value: number }
interface UserMetricsEntry { name: string; usuarios: number; ativos: number; propostas: number }
interface LoginChartEntry { date: string; attempts: number; successful: number; failed: number }

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  roles: UserRole[];
  recentActivities: Activity[];
  roleChartData: RoleChartEntry[];
  userMetricsData: UserMetricsEntry[];
  loginChartData: LoginChartEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  period: '7d' | '30d' | '90d';
  setPeriod: (period: '7d' | '30d' | '90d') => void;
  userRole: string;
  setUserRole: (role: string) => void;
}

interface UseDashboardDataOptions {
  enabled?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  FINANCEIRO: 'Financeiro',
  ESTOQUE: 'Estoque',
  USUARIO: 'Usuário',
  CLIENTE: 'Cliente',
};

export function useDashboardData({ enabled = true }: UseDashboardDataOptions = {}): UseDashboardDataReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [roleChartData, setRoleChartData] = useState<RoleChartEntry[]>([]);
  const [userMetricsData, setUserMetricsData] = useState<UserMetricsEntry[]>([]);
  const [loginChartData, setLoginChartData] = useState<LoginChartEntry[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [userRole, setUserRole] = useState<string>('all');

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics?period=${period}&role=${userRole}`, {
        signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const data = raw.data ?? raw;
      if (signal?.aborted) return;
      const ov = data.overview;

      setStats({
        totalUsers: ov.totalUsers,
        activeUsers: ov.activeUsers,
        totalProposals: ov.totalProposals,
        propostasAprovadas: ov.propostasAprovadas ?? 0,
        propostasPendentes: ov.propostasPendentes ?? 0,
        totalClients: ov.totalClients,
        loginAttempts: ov.loginAttempts,
        failedLogins: ov.failedLogins,
        auditEvents: ov.auditEvents,
        systemHealth: ov.systemHealth,
        lastActivityAt: ov.lastActivityAt ?? null,
      });

      // Map roles array for the "Por Função" tab
      const apiRoles: UserRole[] = (data.charts.usersByRole as Array<{ role: string; count: number }>).map(r => ({
        id: r.role,
        name: ROLE_LABELS[r.role] ?? r.role,
        permissions: r.role === 'ADMIN' ? ['all'] : r.role === 'GERENTE' ? ['read', 'write'] : ['read'],
        userCount: r.count,
      }));

      setRoles(apiRoles);
      setRecentActivities(data.recentActivity ?? []);

      // Chart data
      setRoleChartData(
        (data.charts.usersByRole as Array<{ role: string; count: number }>).map(r => ({
          name: ROLE_LABELS[r.role] ?? r.role,
          value: r.count,
        }))
      );
      setUserMetricsData(data.charts.userMetrics ?? []);
      setLoginChartData(data.charts.loginAttemptsByDay ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError('Erro ao carregar dados do dashboard');
      console.error('Dashboard data fetch error:', err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, period, userRole]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetchDashboardData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [enabled, fetchDashboardData]);

  const refetch = useCallback(() => {
    if (!enabled) return;
    fetchDashboardData();
  }, [enabled, fetchDashboardData]);

  return {
    stats,
    roles,
    recentActivities,
    roleChartData,
    userMetricsData,
    loginChartData,
    loading,
    error,
    refetch,
    period,
    setPeriod,
    userRole,
    setUserRole,
  };
}
