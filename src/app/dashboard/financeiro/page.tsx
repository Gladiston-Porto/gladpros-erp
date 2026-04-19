import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card'
import { FinanceCard } from '@gladpros/ui/finance-card'
import { PageHeader } from '@gladpros/ui/page-header'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  BellRing,
  Landmark,
  RefreshCw,
  Wallet,
} from 'lucide-react'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)

function FinanceiroSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-muted rounded-2xl animate-pulse w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function DashboardFinanceiroPage() {
  return (
    <Suspense fallback={<FinanceiroSkeleton />}>
      <FinanceiroContent />
    </Suspense>
  )
}

async function FinanceiroContent() {
  const empresaId = 1

  const [receitasRecebidas, despesasPagas, receitasPendentes, despesasPendentes, contas, transferenciasPendentes] =
    await Promise.all([
      prisma.revenue.aggregate({
        _sum: { valor: true },
        where: { empresaId, status: 'RECEBIDA' },
      }),
      prisma.expense.aggregate({
        _sum: { valor: true },
        where: { empresaId, status: 'PAGA' },
      }),
      prisma.revenue.count({
        where: {
          empresaId,
          status: {
            in: ['PENDENTE', 'VENCIDA'],
          },
        },
      }),
      prisma.expense.count({
        where: {
          empresaId,
          status: {
            in: ['PENDENTE', 'AGUARDANDO_APROVACAO', 'APROVADA'],
          },
        },
      }),
      prisma.bankAccount.findMany({
        where: { empresaId, ativo: true },
        select: {
          id: true,
          nome: true,
          banco: true,
          saldoAtual: true,
          principal: true,
          ultimaConciliacao: true,
        },
        orderBy: [{ principal: 'desc' }, { nome: 'asc' }],
      }),
      prisma.bankTransfer.count({
        where: {
          empresaId,
          status: {
            in: ['PENDENTE', 'PROCESSANDO'],
          },
        },
      }),
    ])

  const totalReceitas = Number(receitasRecebidas._sum.valor ?? 0)
  const totalDespesas = Number(despesasPagas._sum.valor ?? 0)
  const saldoContas = contas.reduce((sum, conta) => sum + Number(conta.saldoAtual ?? 0), 0)
  const saldoLiquido = totalReceitas - totalDespesas
  const pendenciasTotais = receitasPendentes + despesasPendentes + transferenciasPendentes

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financeiro"
        description="Resumo consolidado de receitas, despesas, contas bancárias e fluxo de caixa."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro' },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/financeiro/despesas/novo">
              <Button size="lg">
                <ArrowDownCircle className="h-4 w-4" />
                Nova despesa
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/receitas/novo">
              <Button size="lg" variant="secondary">
                <ArrowUpCircle className="h-4 w-4" />
                Nova receita
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero Section - GladPros Design System v2.0 */}
      <section 
        className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 text-white shadow-elevated"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">GESTÃO FINANCEIRA</p>
            <h2 className="text-2xl font-semibold">Resumo Consolidado</h2>
            <p className="text-sm text-white/80">Controle completo de receitas e despesas</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 px-4 py-1">
              <p className="text-xs text-white/70">Saldo Líquido</p>
              <p className="text-2xl font-semibold">{formatCurrency(saldoLiquido)}</p>
            </div>
          </div>
        </div>

        {/* Grid de Stats */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="space-y-1 rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-white/80">Receitas Recebidas</p>
            <p className="text-3xl font-semibold">{formatCurrency(totalReceitas)}</p>
          </div>
          <div className="space-y-1 rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-white/80">Despesas Pagas</p>
            <p className="text-3xl font-semibold">{formatCurrency(totalDespesas)}</p>
          </div>
          <div className="space-y-1 rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-white/80">Saldo Contas</p>
            <p className="text-3xl font-semibold">{formatCurrency(saldoContas)}</p>
          </div>
          <div className="space-y-1 rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-white/80">Pendências</p>
            <p className="text-3xl font-semibold">{pendenciasTotais}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          title="Saldo consolidado"
          value={formatCurrency(saldoLiquido)}
          variant={saldoLiquido >= 0 ? 'income' : 'expense'}
          icon={<Wallet className="h-6 w-6" />}
          description="Receitas recebidas - despesas pagas"
        />
        <FinanceCard
          title="Receitas recebidas"
          value={formatCurrency(totalReceitas)}
          variant="income"
          icon={<ArrowUpCircle className="h-6 w-6" />}
        />
        <FinanceCard
          title="Despesas pagas"
          value={formatCurrency(totalDespesas)}
          variant="expense"
          icon={<ArrowDownCircle className="h-6 w-6" />}
        />
        <FinanceCard
          title="Pendências ativas"
          value={pendenciasTotais}
          variant="neutral"
          icon={<BellRing className="h-6 w-6" />}
          description="Receitas e despesas aguardando ação"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contas bancárias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
              <p className="text-sm font-medium text-muted-foreground">Saldo total</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(saldoContas)}</p>
            </div>
            <div className="space-y-3">
              {contas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex flex-col rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {conta.nome}
                      {conta.principal && (
                        <span className="ml-2 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
                          Principal
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{conta.banco}</p>
                  </div>
                  <div className="mt-3 flex flex-col items-start md:items-end">
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(Number(conta.saldoAtual ?? 0))}
                    </span>
                    {conta.ultimaConciliacao && (
                      <span className="text-xs text-muted-foreground">
                        Última conciliação {conta.ultimaConciliacao.toLocaleDateString('en-US')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {contas.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma conta bancária ativa encontrada.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/financeiro/contas">
                <Button variant="outline" size="lg">
                  <Landmark className="h-4 w-4" />
                  Ver contas
                </Button>
              </Link>
              <Link href="/dashboard/financeiro/transferencias/novo">
                <Button variant="secondary" size="lg">
                  <RefreshCw className="h-4 w-4" />
                  Nova transferência
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas e próximos passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">Receitas pendentes</p>
              <p className="text-2xl font-bold text-yellow-900">{receitasPendentes}</p>
              <p className="text-xs text-yellow-800 mt-1">
                Receitas aguardando confirmação de recebimento.
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-800">Despesas aguardando ação</p>
              <p className="text-2xl font-bold text-orange-900">{despesasPendentes}</p>
              <p className="text-xs text-orange-800 mt-1">
                Inclui despesas pendentes, em aprovação ou aprovadas sem pagamento.
              </p>
            </div>
            <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4">
              <p className="text-sm font-medium text-brand-blue">Transferências em processamento</p>
              <p className="text-2xl font-bold text-brand-blue">{transferenciasPendentes}</p>
              <p className="text-xs text-brand-blue mt-1">
                Transferências bancárias aguardando conciliação.
              </p>
            </div>
            <Link href="/dashboard/financeiro/fluxo-caixa">
              <Button className="w-full" size="lg">
                <BadgeDollarSign className="h-4 w-4" />
                Abrir fluxo de caixa
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
