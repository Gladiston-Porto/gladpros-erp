import { lazy, Suspense, memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

// Lazy load heavy chart components
const BarChart = lazy(() => import("recharts").then(module => ({ default: module.BarChart })));
const ResponsiveContainer = lazy(() => import("recharts").then(module => ({ default: module.ResponsiveContainer })));
const XAxis = lazy(() => import("recharts").then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import("recharts").then(module => ({ default: module.YAxis })));
const Bar = lazy(() => import("recharts").then(module => ({ default: module.Bar })));

// Loading component for charts
function ChartLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-[300px] bg-muted rounded-2xl flex items-center justify-center">
        <div className="text-muted-foreground">Carregando gráfico...</div>
      </div>
    </div>
  );
}

interface DashboardChartsProps {
  chartData: Array<{
    name: string;
    total: number;
  }>;
  statusData?: Array<{
    label: string;
    value: string;
  }>;
}

const DEFAULT_STATUS_DATA = [
  { label: 'Aprovadas', value: '—' },
  { label: 'Pendentes', value: '—' },
  { label: 'Canceladas', value: '—' },
];

// Componente memoizado com comparação profunda de props
export const DashboardCharts = memo(function DashboardCharts({ chartData, statusData = DEFAULT_STATUS_DATA }: DashboardChartsProps) {
  // Memoizar dados do gráfico para evitar re-renders desnecessários
  const memoizedData = useMemo(() => {
    return chartData.map(item => ({
      ...item,
      // Garantir que os valores sejam números
      total: Number(item.total) || 0
    }));
  }, [chartData]);

  // Memoizar configuração do gráfico
  const chartConfig = useMemo(() => ({
    data: memoizedData,
    margin: { top: 20, right: 30, left: 20, bottom: 5 }
  }), [memoizedData]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Propostas por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartLoading />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart {...chartConfig}>
                <XAxis dataKey="name" />
                <YAxis />
                <Bar dataKey="total" fill="var(--color-brand-primary, #0098DA)" />
              </BarChart>
            </ResponsiveContainer>
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status das Propostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statusData.map(item => (
              <div key={item.label} className="flex justify-between">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
