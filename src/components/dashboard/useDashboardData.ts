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

        setData({
          kpis: result.kpis,
          revenueChart: result.charts.revenue,
          proposalsChart: result.charts.proposals,
          clientsChart: result.charts.clients,
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
