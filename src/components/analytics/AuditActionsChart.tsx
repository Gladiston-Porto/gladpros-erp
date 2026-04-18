// src/components/analytics/AuditActionsChart.tsx
'use client';

import { lazy, Suspense } from 'react';

const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));

function ChartLoading() {
  return <div className="w-full h-80 animate-pulse bg-muted rounded-lg" />;
}

interface AuditActionsChartProps {
  data: Array<{
    action: string;
    count: number;
  }>;
}

export function AuditActionsChart({ data }: AuditActionsChartProps) {
  return (
    <div className="w-full h-80">
      <Suspense fallback={<ChartLoading />}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="action"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [value, 'Ocorrências']}
            />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Suspense>
    </div>
  );
}
