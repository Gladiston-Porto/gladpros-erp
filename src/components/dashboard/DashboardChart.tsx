// src/components/dashboard/DashboardChart.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

interface DashboardChartProps {
  title: string;
  description?: string;
  data: ChartData;
  type: 'line' | 'bar' | 'doughnut';
  height?: number;
}

type ChartComponents = {
   
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Line: React.ComponentType<any>;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Bar: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Doughnut: React.ComponentType<any>;
} | null;

export const DashboardChart = ({
  title,
  description,
  data,
  type,
  height = 300
}: DashboardChartProps) => {
  const [charts, setCharts] = useState<ChartComponents>(null);

  useEffect(() => {
    let cancelled = false;
    // Dynamic import — chart.js (~200KB) + react-chartjs-2 only load
    // when this component mounts, not on cold start
    Promise.all([
      import('chart.js'),
      import('react-chartjs-2'),
    ]).then(([chartjs, reactChartjs2]) => {
      if (cancelled) return;

      chartjs.Chart.register(
        chartjs.CategoryScale,
        chartjs.LinearScale,
        chartjs.PointElement,
        chartjs.LineElement,
        chartjs.BarElement,
        chartjs.Title,
        chartjs.Tooltip,
        chartjs.Legend,
        chartjs.ArcElement,
      );

      setCharts({
        Line: reactChartjs2.Line,
        Bar: reactChartjs2.Bar,
        Doughnut: reactChartjs2.Doughnut,
      });
    });
    return () => { cancelled = true; };
  }, []);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: type !== 'doughnut' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: number | string) {
            if (typeof value === 'number') {
              if (value >= 1000000) {
                return `$ ${(value / 1000000).toFixed(1)}M`;
              } else if (value >= 1000) {
                return `$ ${(value / 1000).toFixed(0)}K`;
              }
              return value.toLocaleString('en-US');
            }
            return value;
          },
        },
      },
    } : undefined,
  }), [type]);

  if (!charts) {
    return (
      <div className="p-6 border rounded-2xl bg-card shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div style={{ height: `${height}px` }} className="animate-pulse bg-muted rounded-2xl" />
      </div>
    );
  }

  const { Line, Bar, Doughnut } = charts;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={data} options={options} height={height} />;
      case 'bar':
        return <Bar data={data} options={options} height={height} />;
      case 'doughnut':
        return <Doughnut data={data} options={options} height={height} />;
      default:
        return <Line data={data} options={options} height={height} />;
    }
  };

  return (
    <div className="p-6 border rounded-2xl bg-card shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div style={{ height: `${height}px` }}>
        {renderChart()}
      </div>
    </div>
  );
};
