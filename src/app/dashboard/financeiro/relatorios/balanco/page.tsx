import Link from 'next/link'
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

export default async function BalancoPage() {
  const empresaId = 1;

  // ATIVO
  // Caixa e Bancos
  const contasBancarias = await prisma.bankAccount.findMany({
    where: {
      empresaId,
      ativo: true,
    },
  });

  // Receitas a receber (Ativo)
  const receitasAReceber = await prisma.revenue.findMany({
    where: {
      empresaId,
      status: { in: ['PENDENTE', 'VENCIDA'] },
    },
  });

  // PASSIVO
  // Despesas a pagar (Passivo)
  const despesasAPagar = await prisma.expense.findMany({
    where: {
      empresaId,
      status: { in: ['PENDENTE', 'AGUARDANDO_APROVACAO', 'APROVADA'] },
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
          <div className="flex gap-3">
            <Link href="/dashboard/financeiro/relatorios/dre">
              <Button variant="outline" size="lg">
                <FileBarChart2 className="h-4 w-4" />
                Ver DRE
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/relatorios/balanco/exportar">
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
