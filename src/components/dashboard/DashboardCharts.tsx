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
      <div className="h-[300px] bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Carregando gráfico...</div>
      </div>
    </div>
  );
}

interface DashboardChartsProps {
  chartData: Array<{
    name: string;
    total: number;
  }>;
}

// Componente memoizado com comparação profunda de props
export const DashboardCharts = memo(function DashboardCharts({ chartData }: DashboardChartsProps) {
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
                <Bar dataKey="total" fill="#8884d8" />
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
            <div className="flex justify-between">
              <span>Aprovadas</span>
              <span>75%</span>
            </div>
            <div className="flex justify-between">
              <span>Pendentes</span>
              <span>20%</span>
            </div>
            <div className="flex justify-between">
              <span>Canceladas</span>
              <span>5%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
