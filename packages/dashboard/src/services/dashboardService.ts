// packages/dashboard/src/services/dashboardService.ts
import { DashboardStatsResponse, DashboardChartsResponse } from '../types/dashboard';

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  const response = await fetch('/api/dashboard/stats');

  if (!response.ok) {
    throw new Error('Erro ao carregar estatísticas do dashboard');
  }

  return response.json();
}

export async function getDashboardCharts(): Promise<DashboardChartsResponse> {
  const response = await fetch('/api/dashboard/charts');

  if (!response.ok) {
    throw new Error('Erro ao carregar gráficos do dashboard');
  }

  return response.json();
}