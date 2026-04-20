// src/components/dashboard/useDashboardData.ts
import { useState, useEffect } from 'react';

export interface ExecutiveKPIs {
  totalRevenue: number;
  totalClients: number;
  totalProposals: number;
  conversionRate: number;
  monthlyGrowth: number;
  activeClients: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

export interface DashboardData {
  kpis: ExecutiveKPIs;
  revenueChart: ChartData;
  proposalsChart: ChartData;
  clientsChart: ChartData;
  loading: boolean;
  error: string | null;
}

export const useDashboardData = (period: string = '30d') => {
  const [data, setData] = useState<DashboardData>({
    kpis: {
      totalRevenue: 0,
      totalClients: 0,
      totalProposals: 0,
      conversionRate: 0,
      monthlyGrowth: 0,
      activeClients: 0,
    },
    revenueChart: { labels: [], datasets: [] },
    proposalsChart: { labels: [], datasets: [] },
    clientsChart: { labels: [], datasets: [] },
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch(`/api/dashboard/executive?period=${period}`);
        if (!response.ok) {
          throw new Error('Erro ao carregar dados do dashboard');
        }

        const result = await response.json();
        const executiveData = result.data ?? result;
        const chart = executiveData.chartData;

        setData({
          kpis: {
            totalRevenue: executiveData.kpis?.receitaTotal ?? 0,
            totalClients: executiveData.kpis?.clientesAtivos ?? 0,
            totalProposals: executiveData.kpis?.propostasTotal ?? 0,
            conversionRate: executiveData.kpis?.propostasTotal > 0
              ? (executiveData.kpis.propostasAprovadas / executiveData.kpis.propostasTotal) * 100
              : 0,
            monthlyGrowth: executiveData.kpis?.crescimentoReceita ?? 0,
            activeClients: executiveData.kpis?.clientesAtivos ?? 0,
          },
          revenueChart: chart
            ? {
                labels: chart.labels,
                datasets: [{
                  label: 'Receita',
                  data: chart.revenue,
                  borderColor: '#0098DA',
                  backgroundColor: 'rgba(0,152,218,0.15)',
                }],
              }
            : { labels: [], datasets: [] },
          proposalsChart: chart
            ? {
                labels: chart.labels,
                datasets: [{
                  label: 'Propostas',
                  data: chart.proposals,
                  borderColor: '#FF8C00',
                  backgroundColor: 'rgba(255,140,0,0.15)',
                }],
              }
            : { labels: [], datasets: [] },
          clientsChart: chart
            ? {
                labels: chart.labels,
                datasets: [{
                  label: 'Novos Clientes',
                  data: chart.clients,
                  borderColor: '#22c55e',
                  backgroundColor: 'rgba(34,197,94,0.15)',
                }],
              }
            : { labels: [], datasets: [] },
          loading: false,
          error: null,
        });
      } catch (error) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }));
      }
    };

    fetchDashboardData();
  }, [period]);

  return data;
};
