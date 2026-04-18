/**
 * Dashboard Charts - Gráficos e estatísticas
 */

import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/components/financeiro/shared/formatters';

export async function DashboardCharts({ empresaId }: { empresaId: number }) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/rh/dashboard?empresaId=${empresaId}`, {
    cache: 'no-store',
  });

  const { data } = await response.json();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Departamentos */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Por Departamento</h3>
        </div>
        <div className="space-y-3">
          {data.departamentos.map((dept: any) => (
            <div key={dept.departamento} className="flex items-center justify-between">
              <span className="text-sm">{dept.departamento}</span>
              <span className="font-medium">{dept._count.departamento}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Turnover */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Turnover</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Taxa de Turnover</p>
            <p className="text-2xl font-bold">{data.turnover.taxaTurnover.toFixed(1)}%</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">Admissões</p>
              <p className="text-lg font-medium">{data.turnover.admissoesAno}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Demissões</p>
              <p className="text-lg font-medium">{data.turnover.demissoesAno}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Folha de Pagamento */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Folha de Pagamento</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Total Mensal</p>
            <p className="text-2xl font-bold">{formatCurrency(Number(data.folhaPagamento.totalMensal))}</p>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">Salário Médio</p>
            <p className="text-lg font-medium">{formatCurrency(Number(data.folhaPagamento.salarioMedio))}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
