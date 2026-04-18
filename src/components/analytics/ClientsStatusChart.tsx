// src/components/analytics/ClientsStatusChart.tsx
'use client';

import { lazy, Suspense } from 'react';

const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const Cell = lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));

function ChartLoading() {
  return <div className="w-full h-80 animate-pulse bg-muted rounded-lg" />;
}

interface ClientsStatusChartProps {
  data: Array<{
    status: string;
    count: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function ClientsStatusChart({ data }: ClientsStatusChartProps) {
  return (
    <div className="w-full h-80">
      <Suspense fallback={<ChartLoading />}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ status, percent }: any) => `${status} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Clientes']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Suspense>
    </div>
  );
}
