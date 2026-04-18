// src/components/analytics/LoginsByHourChart.tsx
'use client';

import { lazy, Suspense } from 'react';

const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));

function ChartLoading() {
  return <div className="w-full h-[300px] animate-pulse bg-muted rounded-lg" />;
}

interface LoginsByHourChartProps {
  data: Array<{
    hour: number;
    count: number;
  }>;
}

export function LoginsByHourChart({ data }: LoginsByHourChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    hourLabel: `${item.hour.toString().padStart(2, '0')}:00`
  }));

  return (
    <Suspense fallback={<ChartLoading />}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) => `Hora: ${label}`}
            formatter={(value) => [value, 'Logins']}
          />
          <Legend />
          <Bar
            dataKey="count"
            fill="#0098DA"
            name="Logins"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Suspense>
  );
}
