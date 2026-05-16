import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { StatCard } from "@gladpros/ui/stat-card";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

async function FluxoCaixaContent({ empresaId }: { empresaId: number }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  // Next 30 days for projection
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    contas,
    receitasMes,
    despesasMes,
    _receitasPendentes,
    despesasPendentes,
    receitasProximas,
    despesasProximas,
    invoicesAR,
  ] = await Promise.all([
    prisma.bankAccount.aggregate({
      where: { empresaId, ativo: true },
      _sum: { saldoAtual: true },
    }),
    prisma.revenue.aggregate({
      where: { empresaId, status: "RECEBIDA", dataVencimento: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { valor: true },
    }),
    prisma.expense.aggregate({
      where: { empresaId, status: "PAGA", dataVencimento: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { valor: true },
    }),
    prisma.revenue.aggregate({
      where: { empresaId, status: { in: ["PENDENTE", "VENCIDA"] } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { empresaId, status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] } },
      _sum: { valor: true },
      _count: true,
    }),
    // Receitas a vencer nos próximos 30 dias
    prisma.revenue.aggregate({
      where: {
        empresaId,
        status: "PENDENTE",
        dataVencimento: { gte: now, lte: next30 },
      },
      _sum: { valor: true },
      _count: true,
    }),
    // Despesas a vencer nos próximos 30 dias
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "APROVADA"] },
        dataVencimento: { gte: now, lte: next30 },
      },
      _sum: { valor: true },
      _count: true,
    }),
    // A/R: invoices in-flight
    prisma.invoice.aggregate({
      where: {
        empresaId,
        status: { in: ["SENT", "VIEWED", "PARTIAL_PAID", "OVERDUE"] },
      },
      _sum: { saldo: true },
    }),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const saldoCash = Number(contas._sum.saldoAtual ?? 0);
  const totalAR = Number(invoicesAR._sum?.saldo ?? 0);
  const totalAP = Number(despesasPendentes._sum.valor ?? 0);
  const cashPosition = saldoCash + totalAR;
  const projecao30d = cashPosition + Number(receitasProximas._sum.valor ?? 0) - Number(despesasProximas._sum.valor ?? 0);
  const resultado = Number(receitasMes._sum.valor ?? 0) - Number(despesasMes._sum.valor ?? 0);

  return (
    <div className="space-y-6">
      {/* Alert banner if cashflow negative */}
      {cashPosition < totalAP && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Atenção: Fluxo de Caixa Negativo</p>
            <p className="text-sm text-destructive/80 mt-0.5">
              Sua posição de caixa ({fmt(cashPosition)}) está abaixo das obrigações em aberto (
              {fmt(totalAP)}). Gap de {fmt(totalAP - cashPosition)}.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo em caixa"
          value={fmt(saldoCash)}
          icon={<Wallet className="h-5 w-5" />}
          description="Saldo total contas ativas"
          variant={saldoCash >= 0 ? "default" : "expense"}
        />
        <StatCard
          title="A/R (Invoices)"
          value={fmt(totalAR)}
          icon={<TrendingUp className="h-5 w-5" />}
          description="Valor a receber de clientes"
          variant="default"
        />
        <StatCard
          title="A/P (Obrigações)"
          value={fmt(totalAP)}
          icon={<TrendingDown className="h-5 w-5" />}
          description={`${despesasPendentes._count} despesas em aberto`}
          variant={totalAP > cashPosition ? "expense" : "default"}
        />
        <StatCard
          title="Resultado do mês"
          value={fmt(resultado)}
          icon={resultado >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          description="Receitas recebidas - Despesas pagas"
          variant={resultado >= 0 ? "income" : "expense"}
        />
      </div>

      {/* Cashflow position + 30-day projection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Posição Atual</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Saldo em contas</span>
              <span className="font-mono font-semibold text-foreground">{fmt(saldoCash)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">+ A/R (invoices a receber)</span>
              <span className="font-mono font-semibold text-green-500">+ {fmt(totalAR)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm">Posição de Caixa</span>
              <span className={`font-mono font-bold text-lg ${cashPosition >= 0 ? "text-green-500" : "text-destructive"}`}>
                {fmt(cashPosition)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">- A/P (obrigações em aberto)</span>
              <span className="font-mono font-semibold text-destructive">- {fmt(totalAP)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm">Caixa Livre</span>
              <span className={`font-mono font-bold text-lg ${(cashPosition - totalAP) >= 0 ? "text-green-500" : "text-destructive"}`}>
                {fmt(cashPosition - totalAP)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            Projeção — próximos 30 dias
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Posição atual</span>
              <span className="font-mono text-foreground">{fmt(cashPosition)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">
                + Receitas previstas ({receitasProximas._count})
              </span>
              <span className="font-mono text-green-500">
                + {fmt(Number(receitasProximas._sum.valor ?? 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">
                - Despesas previstas ({despesasProximas._count})
              </span>
              <span className="font-mono text-destructive">
                - {fmt(Number(despesasProximas._sum.valor ?? 0))}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm">Projeção 30d</span>
              <span
                className={`font-mono font-bold text-lg ${
                  projecao30d >= 0 ? "text-green-500" : "text-destructive"
                }`}
              >
                {fmt(projecao30d)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function FluxoCaixaPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const empresaId = (user as unknown as { empresaId?: number }).empresaId ?? 1;

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Fluxo de Caixa"
          description="Visão completa de entradas, saídas e projeção financeira"
          icon={<Wallet className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fluxo de Caixa" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <FluxoCaixaContent empresaId={empresaId} />
      </Suspense>
    </div>
  );
}
