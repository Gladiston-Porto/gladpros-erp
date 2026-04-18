'use client';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartData {
  name: string;
  value?: number;
  [key: string]: unknown;
}

interface DashboardChartsProps {
  data: ChartData[];
  type: 'line' | 'area' | 'bar' | 'pie';
  title: string;
  dataKey?: string;
  color?: string;
  height?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function DashboardCharts({
  data,
  type,
  title,
  dataKey = 'value',
  color = '#0088FE',
  height = 300
}: DashboardChartsProps) {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={dataKey} fill={color} />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      default:
        return <div>Tipo de gráfico não suportado</div>;
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

interface UserMetricsEntry { name: string; usuarios: number; ativos: number; propostas: number }

// Componente específico para métricas de usuários
export function UserMetricsChart({ data }: { data?: UserMetricsEntry[] }) {
  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum dado disponível para o período selecionado.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCharts
        data={data as unknown as ChartData[]}
        type="line"
        title="Crescimento de Usuários"
        dataKey="usuarios"
        color="#0088FE"
      />

      <DashboardCharts
        data={data as unknown as ChartData[]}
        type="area"
        title="Usuários Ativos"
        dataKey="ativos"
        color="#00C49F"
      />

      <DashboardCharts
        data={data as unknown as ChartData[]}
        type="bar"
        title="Propostas Criadas"
        dataKey="propostas"
        color="#FFBB28"
      />
    </div>
  );
}

interface RoleChartEntry { name: string; value: number }

// Componente para distribuição de roles
export function RoleDistributionChart({ data }: { data?: RoleChartEntry[] }) {
  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum dado de funções disponível.
      </p>
    );
  }

  return (
    <DashboardCharts
      data={data as ChartData[]}
      type="pie"
      title="Distribuição de Funções"
      dataKey="value"
      height={400}
    />
  );
}

interface LoginChartEntry { date: string; attempts: number; successful: number; failed: number }

// Componente para métricas de segurança
export function SecurityMetricsChart({ data }: { data?: LoginChartEntry[] }) {
  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum dado de segurança disponível para o período selecionado.
      </p>
    );
  }

  const chartData = data.map(d => ({
    name: d.date.substring(5),
    logins: d.attempts,
    falhas: d.failed,
    sucesso: d.successful,
  })) as ChartData[];

  return (
    <div className="space-y-6">
      <DashboardCharts
        data={chartData}
        type="bar"
        title="Tentativas de Login por Dia"
        dataKey="logins"
        color="#0088FE"
      />

      <DashboardCharts
        data={chartData}
        type="line"
        title="Falhas de Login"
        dataKey="falhas"
        color="#FF8042"
      />
    </div>
  );
}
