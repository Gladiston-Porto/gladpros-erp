// src/components/analytics/LoginAttemptsChart.tsx
'use client';

import { lazy, Suspense } from 'react';

const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));

function ChartLoading() {
  return <div className="w-full h-80 animate-pulse bg-muted rounded-lg" />;
}

interface LoginAttemptsChartProps {
  data: Array<{
    date: string;
    attempts: number;
    successful: number;
    failed: number;
  }>;
}

export function LoginAttemptsChart({ data }: LoginAttemptsChartProps) {
  return (
    <div className="w-full h-80">
      <Suspense fallback={<ChartLoading />}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
              formatter={(value, name) => [
                value,
                name === 'attempts' ? 'Tentativas' :
                name === 'successful' ? 'Bem-sucedidas' : 'Falhas'
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="attempts"
              stroke="#8884d8"
              strokeWidth={2}
              name="Tentativas"
            />
            <Line
              type="monotone"
              dataKey="successful"
              stroke="#82ca9d"
              strokeWidth={2}
              name="Bem-sucedidas"
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ff7300"
              strokeWidth={2}
              name="Falhas"
            />
          </LineChart>
        </ResponsiveContainer>
      </Suspense>
    </div>
  );
}
