import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@gladpros/ui/card'
import { FinanceCard } from '@gladpros/ui/finance-card'
import { PageHeader } from "@gladpros/ui/page-header"
import { ArrowLeftRight, Download } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/estoque/utils/formatters'

export const metadata = {
  title: 'DRE - Demonstração do Resultado do Exercício | GladPros',
  description: 'Relatório de receitas, despesas e resultado líquido',
};

export default async function DREPage() {
  const empresaId = 1;

  // Buscar receitas recebidas
  const receitas = await prisma.revenue.findMany({
    where: {
      empresaId,
      status: 'RECEBIDA',
    },
    include: {
      categoria: true,
    },
  });

  // Buscar despesas pagas
  const despesas = await prisma.expense.findMany({
    where: {
      empresaId,
      status: 'PAGA',
    },
    include: {
      categoria: true,
    },
  });

  // Calcular totais
  const totalReceitas = receitas.reduce((sum, r) => sum + Number(r.valor), 0);
  const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;

  // Agrupar por categoria
  const receitasPorCategoria = receitas.reduce((acc, r) => {
    const catNome = r.categoria?.nome || 'Sem Categoria';
    if (!acc[catNome]) acc[catNome] = 0;
    acc[catNome] += Number(r.valor);
    return acc;
  }, {} as Record<string, number>);

  const despesasPorCategoria = despesas.reduce((acc, d) => {
    const catNome = d.categoria?.nome || 'Sem Categoria';
    if (!acc[catNome]) acc[catNome] = 0;
    acc[catNome] += Number(d.valor);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <PageHeader
        title="DRE — Resultado do Exercício"
        description="Acompanhe receitas, despesas e o lucro líquido consolidado do período."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/dashboard/financeiro' },
          { label: 'Relatórios', href: '/dashboard/financeiro/relatorios/balanco' },
          { label: 'DRE' },
        ]}
        actions={
          <div className="flex gap-3">
            <Link href="/dashboard/financeiro/relatorios/balanco">
              <Button variant="outline" size="lg">
                <ArrowLeftRight className="h-4 w-4" />
                Ver balanço
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/relatorios/dre/exportar">
              <Button size="lg">
                <Download className="h-4 w-4" />
                Exportar PDF
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <FinanceCard
          title="Total receitas"
          value={formatCurrency(totalReceitas)}
          description={`${receitas.length} lançamentos recebidos`}
          variant="income"
        />
        <FinanceCard
          title="Total despesas"
          value={formatCurrency(totalDespesas)}
          description={`${despesas.length} lançamentos pagos`}
          variant="expense"
        />
        <FinanceCard
          title="Lucro líquido"
          value={formatCurrency(lucroLiquido)}
          description="Resultado do período"
          variant={lucroLiquido >= 0 ? 'income' : 'expense'}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(receitasPorCategoria)
                .sort(([, a], [, b]) => b - a)
                .map(([categoria, valor]) => {
                  const percentual = totalReceitas ? (valor / totalReceitas) * 100 : 0
                  return (
                    <div key={categoria}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{categoria}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(valor)} ({percentual.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full rounded-full bg-gray-100 h-2">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(despesasPorCategoria)
                .sort(([, a], [, b]) => b - a)
                .map(([categoria, valor]) => {
                  const percentual = totalDespesas ? (valor / totalDespesas) * 100 : 0
                  return (
                    <div key={categoria}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{categoria}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(valor)} ({percentual.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full rounded-full bg-gray-100 h-2">
                        <div
                          className="h-2 rounded-full bg-rose-500"
                          style={{ width: `${percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
