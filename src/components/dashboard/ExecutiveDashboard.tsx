// src/components/dashboard/ExecutiveDashboard.tsx
'use client';

import { useDashboardData } from './useDashboardData';
import { KPIGrid } from './KPICard';
import { DashboardChart } from './DashboardChart';

export const ExecutiveDashboard = () => {
  const period = '30d';
  const { kpis, revenueChart, proposalsChart, clientsChart, loading, error } = useDashboardData(period);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-2">Erro ao carregar dashboard</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-muted-foreground">
            Visão geral do desempenho do negócio
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 border rounded-lg">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <KPIGrid kpis={kpis} />
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <DashboardChart
          title="Receita Mensal"
          description="Evolução da receita ao longo do tempo"
          data={revenueChart}
          type="line"
        />

        <DashboardChart
          title="Crescimento de Clientes"
          description="Evolução do número de clientes ativos"
          data={clientsChart}
          type="line"
        />
      </div>

      <DashboardChart
        title="Propostas por Status"
        description="Distribuição das propostas por status"
        data={proposalsChart}
        type="doughnut"
      />
    </div>
  );
};
