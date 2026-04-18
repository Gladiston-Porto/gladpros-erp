// src/components/dashboard/KPICard.tsx
/**
 * KPICard — wrapper de compatibilidade sobre StatCard (@gladpros/ui).
 *
 * Mantém a mesma API externa para não quebrar chamadas existentes,
 * mas agora usa design tokens (CSS variables) — suporte a dark mode.
 */
import React from 'react';
import { DollarSign, FileText, Target, Users } from 'lucide-react';
import { StatCard } from '@gladpros/ui/stat-card';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const KPICard = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
}: KPICardProps) => {
  // Mapear trend para change numérico se change não foi passado
  const resolvedChange =
    change !== undefined
      ? change
      : trend === 'up'
        ? undefined // sem valor numérico — não exibir badge
        : trend === 'down'
          ? undefined
          : undefined;

  // Formatar value — manter a lógica original
  const displayValue = (() => {
    if (typeof value === 'number') {
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      if (title.includes('Taxa') || title.includes('Crescimento'))
        return `${value.toFixed(1)}%`;
      return value.toLocaleString('en-US');
    }
    return value;
  })();

  return (
    <StatCard
      title={title}
      value={displayValue}
      change={resolvedChange}
      changeLabel={changeLabel}
      description={undefined}
      icon={icon}
      variant="default"
    />
  );
};

/* ------------------------------------------------------------------ */
/* KPIGrid — mantém a API original                                       */
/* ------------------------------------------------------------------ */
interface KPIGridProps {
  kpis: {
    totalRevenue: number;
    totalClients: number;
    totalProposals: number;
    conversionRate: number;
    monthlyGrowth: number;
    activeClients: number;
  };
}

export const KPIGrid = ({ kpis }: KPIGridProps) => {
  const kpiData = [
    {
      title: 'Receita Total',
      value: kpis.totalRevenue,
      change: kpis.monthlyGrowth,
      icon: <DollarSign className="size-5" />,
      trend: (kpis.monthlyGrowth > 0
        ? 'up'
        : kpis.monthlyGrowth < 0
          ? 'down'
          : 'neutral') as 'up' | 'down' | 'neutral',
    },
    {
      title: 'Total de Clientes',
      value: kpis.totalClients,
      icon: <Users className="size-5" />,
    },
    {
      title: 'Propostas Ativas',
      value: kpis.totalProposals,
      icon: <FileText className="size-5" />,
    },
    {
      title: 'Taxa de Conversão',
      value: kpis.conversionRate,
      change: 2.5,
      icon: <Target className="size-5" />,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  );
};
