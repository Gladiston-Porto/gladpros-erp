// src/components/analytics/AnalyticsDashboard.tsx
'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { LoginAttemptsChart } from './LoginAttemptsChart';
import { AuditActionsChart } from './AuditActionsChart';
import { ClientsStatusChart } from './ClientsStatusChart';
import { LoginsByHourChart } from './LoginsByHourChart';
import { ProposalsStatusChart } from './ProposalsStatusChart';

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState('30d');
  const { data, loading, error } = useAnalytics(period);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-600">Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Período:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            aria-label="Período de análise"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Métricas Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total de Usuários</h3>
          <p className="text-2xl font-bold text-gray-900">{data.overview.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Usuários Ativos</h3>
          <p className="text-2xl font-bold text-green-600">{data.overview.activeUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Novos Usuários</h3>
          <p className="text-2xl font-bold text-blue-600">{data.overview.newUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total de Clientes</h3>
          <p className="text-2xl font-bold text-purple-600">{data.overview.totalClients}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tentativas de Login */}
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-white">Tentativas de Login</h3>
          {data.charts.loginAttempts.length > 0 ? (
            <LoginAttemptsChart data={data.charts.loginAttempts} />
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
          )}
        </div>

        {/* Ações de Auditoria */}
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-white">Ações de Auditoria</h3>
          {data.charts.auditActions.length > 0 ? (
            <AuditActionsChart data={data.charts.auditActions} />
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
          )}
        </div>

        {/* Status de Clientes */}
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-white">Clientes por Status</h3>
          {data.charts.clientsByStatus.length > 0 ? (
            <ClientsStatusChart data={data.charts.clientsByStatus} />
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
          )}
        </div>

        {/* Propostas por Status */}
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-white">Propostas por Status</h3>
          {data.charts.proposalsByStatus.length > 0 ? (
            <ProposalsStatusChart data={data.charts.proposalsByStatus} />
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
          )}
        </div>

        {/* Logins por Hora */}
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800 lg:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-white">Logins por Hora</h3>
          {data.charts.loginsByHour.length > 0 ? (
            <LoginsByHourChart data={data.charts.loginsByHour} />
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
          )}
        </div>
      </div>
    </div>
  );
}
