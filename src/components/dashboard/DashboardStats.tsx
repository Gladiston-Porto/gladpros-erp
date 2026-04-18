import { memo } from "react";
import { StatCard } from "@gladpros/ui/stat-card";
import { FileText, CheckCircle, Clock, Users } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalPropostas: number;
    propostasAprovadas: number;
    propostasPendentes: number;
    totalClientes: number;
  };
}

export const DashboardStats = memo(function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Propostas"
        value={stats.totalPropostas}
        icon={<FileText />}
        variant="default"
        compact
      />
      <StatCard
        title="Propostas Aprovadas"
        value={stats.propostasAprovadas}
        icon={<CheckCircle />}
        variant="income"
        compact
      />
      <StatCard
        title="Propostas Pendentes"
        value={stats.propostasPendentes}
        icon={<Clock />}
        variant="warning"
        compact
      />
      <StatCard
        title="Total de Clientes"
        value={stats.totalClientes}
        icon={<Users />}
        variant="orange"
        compact
      />
    </div>
  );
});
