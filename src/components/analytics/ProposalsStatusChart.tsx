// src/components/analytics/ProposalsStatusChart.tsx
'use client';

import { lazy, Suspense } from 'react';

const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const Cell = lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));

function ChartLoading() {
  return <div className="w-full h-[300px] animate-pulse bg-muted rounded-lg" />;
}

interface ProposalsStatusChartProps {
  data: Array<{
    status: string;
    count: number;
  }>;
}

const COLORS = ['#0098DA', '#3E4095', '#F58634', '#ED3237', '#00A651'];

export function ProposalsStatusChart({ data }: ProposalsStatusChartProps) {
  return (
    <Suspense fallback={<ChartLoading />}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, 'Propostas']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Suspense>
  );
}
