import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireServerUser } from '@/shared/lib/requireServerUser'
import { can, type Role } from '@/shared/lib/rbac-core'
import { Button } from '@gladpros/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@gladpros/ui/card'
import { FinanceCard } from '@gladpros/ui/finance-card'
import { PageHeader } from "@gladpros/ui/page-header"
import { Download, FileBarChart2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/estoque/utils/formatters'

export const metadata = {
  title: 'Balanço Patrimonial | GladPros',
  description: 'Relatório de ativos, passivos e patrimônio líquido',
};

export default async function BalancoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const user = await requireServerUser()
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403")
  const sp = await searchParams
  const empresaId = 1;

  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const defaultEnd = now.toISOString().split('T')[0]
   
  const _startDate = sp.startDate ?? defaultStart
  const endDate = sp.endDate ?? defaultEnd

  const periodEnd = new Date(endDate + 'T23:59:59')

  // ATIVO - Caixa e Bancos (snapshot do momento, sem filtro de período)
  const contasBancarias = await prisma.bankAccount.findMany({
    where: {
      empresaId,
      ativo: true,
    },
  });

  // Receitas a receber (Ativo) — até o fim do período
  const receitasAReceber = await prisma.revenue.findMany({
    where: {
      empresaId,
      status: { in: ['PENDENTE', 'VENCIDA'] },
      dataVencimento: { lte: periodEnd },
    },
  });

  // PASSIVO - Despesas a pagar — até o fim do período
  const despesasAPagar = await prisma.expense.findMany({
    where: {
      empresaId,
      status: { in: ['PENDENTE', 'AGUARDANDO_APROVACAO', 'APROVADA'] },
      dataVencimento: { lte: periodEnd },
    },
  });

  // Calcular totais
  const totalCaixaBancos = contasBancarias.reduce(
    (sum, c) => sum + Number(c.saldoAtual),
    0
  );
  const totalAReceber = receitasAReceber.reduce(
    (sum, r) => sum + Number(r.valor),
    0
  );
  const totalAtivo = totalCaixaBancos + totalAReceber;

  const totalAPagar = despesasAPagar.reduce(
    (sum, d) => sum + Number(d.valor),
    0
  );
  const totalPassivo = totalAPagar;

  const patrimonioLiquido = totalAtivo - totalPassivo;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Balanço patrimonial"
        description="Visão consolidada de ativos, passivos e patrimônio líquido para apoiar decisões rápidas."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/dashboard/financeiro' },
          { label: 'Relatórios', href: '/dashboard/financeiro/relatorios/dre' },
          { label: 'Balanço' },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/financeiro/relatorios/dre">
              <Button variant="outline" size="lg">
                <FileBarChart2 className="h-4 w-4" />
                Ver DRE
              </Button>
            </Link>
            <Link href={`/api/financeiro/reports/balanco/export?endDate=${endDate}`}>
              <Button size="lg">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </Link>
          </div>
        }
      />

      {/* Period Filter */}
      <form method="GET" className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor="endDateBalanco">
              Data de referência
            </label>
            <input
              id="endDateBalanco"
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="grid gap-6 md:grid-cols-3">
        <FinanceCard
          title="Total ativo"
          value={formatCurrency(totalAtivo)}
          description="Recursos disponíveis e contas a receber"
          variant="income"
        />
        <FinanceCard
          title="Total passivo"
          value={formatCurrency(totalPassivo)}
          description="Obrigações e contas a pagar"
          variant="expense"
        />
        <FinanceCard
          title="Patrimônio líquido"
          value={formatCurrency(patrimonioLiquido)}
          description="Diferença entre ativo e passivo"
          variant={patrimonioLiquido >= 0 ? 'income' : 'expense'}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Caixa e Bancos</span>
                  <span className="font-semibold">
                    {formatCurrency(totalCaixaBancos)}
                  </span>
                </div>
                <div className="ml-4 space-y-1 text-sm text-muted-foreground">
                  {contasBancarias.map((conta) => (
                    <div key={conta.id} className="flex justify-between">
                      <span>{conta.nome}</span>
                      <span>{formatCurrency(Number(conta.saldoAtual))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Contas a Receber</span>
                  <span className="font-semibold">
                    {formatCurrency(totalAReceber)}
                  </span>
                </div>
                <div className="ml-4 text-sm text-muted-foreground">
                  {receitasAReceber.length} receitas pendentes
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Total Ativo</span>
                  <span className="font-bold text-lg text-blue-600">
                    {formatCurrency(totalAtivo)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Contas a Pagar</span>
                  <span className="font-semibold">
                    {formatCurrency(totalAPagar)}
                  </span>
                </div>
                <div className="ml-4 text-sm text-muted-foreground">
                  {despesasAPagar.length} despesas pendentes
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-4">
                  <span className="font-bold text-lg">Total Passivo</span>
                  <span className="font-bold text-lg text-orange-600">
                    {formatCurrency(totalPassivo)}
                  </span>
                </div>

                <div className="flex justify-between border-t pt-4">
                  <span className="font-bold text-lg">Patrimônio Líquido</span>
                  <span
                    className={`font-bold text-lg ${
                      patrimonioLiquido >= 0 ? 'text-green-600' : 'text-destructive'
                    }`}
                  >
                    {formatCurrency(patrimonioLiquido)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
