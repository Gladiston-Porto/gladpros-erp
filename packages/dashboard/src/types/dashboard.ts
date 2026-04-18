// Tipos para dashboard
export interface DashboardStatsResponse {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  totalProposals: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
}

export interface DashboardChartsResponse {
  userGrowth: Array<{
    month: string;
    users: number;
    activeUsers: number;
  }>;
  proposalStatus: Array<{
    status: string;
    count: number;
  }>;
}