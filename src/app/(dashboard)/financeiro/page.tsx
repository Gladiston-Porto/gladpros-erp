import Link from "next/link";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { StatCard } from "@gladpros/ui/stat-card";
import { Button } from "@gladpros/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  AlertTriangle,
  BarChart2,
  Plus,
} from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function FinanceiroDashboardContent({ empresaId }: { empresaId: number }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [
    contas,
    receitasMes,
    despesasMes,
    despesasPendentesAprovacao,
    receitasVencendoHoje,
    despesasVencendoHoje,
    // A/R — Invoices a receber
    invoicesAR,
    invoicesOverdue,
    // A/P — Despesas a pagar
    expensesAP,
    expensesVencidas,
    // Pipeline: projetos ativos
    projetosAtivosCount,
    projetosAtivosSoma,
  ] = await Promise.all([
    // Contas ativas com saldo
    prisma.bankAccount.findMany({
      where: { empresaId, ativo: true },
      select: { id: true, nome: true, banco: true, saldoAtual: true, principal: true, tipo: true },
      orderBy: [{ principal: "desc" }, { nome: "asc" }],
    }),
    // Receitas do mês (recebidas)
    prisma.revenue.aggregate({
      where: { empresaId, dataVencimento: { gte: startOfMonth, lte: endOfMonth }, status: "RECEBIDA" },
      _sum: { valor: true },
      _count: true,
    }),
    // Despesas do mês (pagas)
    prisma.expense.aggregate({
      where: { empresaId, dataVencimento: { gte: startOfMonth, lte: endOfMonth }, status: "PAGA" },
      _sum: { valor: true },
      _count: true,
    }),
    // Despesas pendentes de aprovação
    prisma.expenseApproval.count({
      where: { expense: { empresaId }, status: "PENDENTE" },
    }),
    // Receitas vencendo hoje (não recebidas)
    prisma.revenue.count({
      where: { empresaId, dataVencimento: { gte: todayStart, lte: todayEnd }, status: { not: "RECEBIDA" } },
    }),
    // Despesas vencendo hoje (não pagas)
    prisma.expense.count({
      where: { empresaId, dataVencimento: { gte: todayStart, lte: todayEnd }, status: { not: "PAGA" } },
    }),
    // A/R: Invoices abertas (SENT + VIEWED + PARTIAL_PAID) — dinheiro a receber
    prisma.invoice.aggregate({
      where: {
        empresaId,
        status: { in: ["SENT", "VIEWED", "PARTIAL_PAID"] },
      },
      _sum: { saldo: true },
      _count: true,
    }),
    // A/R: Invoices OVERDUE — vencidas e não pagas (urgente)
    prisma.invoice.aggregate({
      where: { empresaId, status: "OVERDUE" },
      _sum: { saldo: true },
      _count: true,
    }),
    // A/P: Despesas a pagar (PENDENTE + AGUARDANDO_APROVACAO + APROVADA)
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] },
      },
      _sum: { valor: true },
      _count: true,
    }),
    // A/P: Despesas já vencidas e não pagas
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] },
        dataVencimento: { lt: todayStart },
      },
      _sum: { valor: true },
      _count: true,
    }),
    // Pipeline: count of projetos ativos
    prisma.projeto.count({
      where: {
        status: { in: ["em_execucao", "planejado", "em_inspecao"] },
      },
    }),
    // Pipeline: soma do valor estimado dos projetos ativos
    prisma.projeto.aggregate({
      where: {
        status: { in: ["em_execucao", "planejado", "em_inspecao"] },
      },
      _sum: { valorEstimado: true },
    }),
  ]);

  const saldoTotal = contas.reduce((sum, c) => sum + Number(c.saldoAtual), 0);
  const totalRecebido = Number(receitasMes._sum.valor ?? 0);
  const totalPago = Number(despesasMes._sum.valor ?? 0);
  const resultadoMes = totalRecebido - totalPago;

  // A/R totals
  const totalAR = Number(invoicesAR._sum.saldo ?? 0) + Number(invoicesOverdue._sum.saldo ?? 0);
  const totalOverdue = Number(invoicesOverdue._sum.saldo ?? 0);

  // A/P totals
  const totalAP = Number(expensesAP._sum.valor ?? 0);
  const totalAPVencidas = Number(expensesVencidas._sum.valor ?? 0);

  // Cashflow alert: can we cover our payables?
  const cashPosition = saldoTotal + totalAR;
  const cashflowNegativo = cashPosition < totalAP;
  const cashflowGap = totalAP - cashPosition;

  // Pipeline
  const totalPipeline = Number(projetosAtivosSoma._sum?.valorEstimado ?? 0);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-6">

      {/* ── CASHFLOW ALERT — shown when company may go negative ── */}
      {cashflowNegativo && (
        <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 border border-destructive/30 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Alerta: Risco de Caixa Negativo</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Suas contas a pagar ({fmt(totalAP)}) superam sua posição de caixa + recebíveis ({fmt(cashPosition)}).
              Gap: {fmt(cashflowGap)}. Ação recomendada: acelerar cobranças ou adiar pagamentos não urgentes.
            </p>
          </div>
        </div>
      )}

      {/* ── ALERT BAR — operational alerts ── */}
      {(despesasPendentesAprovacao > 0 || receitasVencendoHoje > 0 || despesasVencendoHoje > 0 || invoicesOverdue._count > 0 || totalAPVencidas > 0) && (
        <div className="flex flex-wrap gap-3">
          {invoicesOverdue._count > 0 && (
            <Link href="/invoices?status=OVERDUE">
              <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive cursor-pointer hover:bg-destructive/20 transition-colors">
                <AlertTriangle className="h-4 w-4" />
                {invoicesOverdue._count} invoice{invoicesOverdue._count > 1 ? "s" : ""} vencida{invoicesOverdue._count > 1 ? "s" : ""} — {fmt(totalOverdue)}
              </div>
            </Link>
          )}
          {totalAPVencidas > 0 && (
            <Link href="/financeiro/despesas?vencidas=true">
              <div className="flex items-center gap-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-2 text-sm text-orange-600 cursor-pointer hover:bg-orange-500/20 transition-colors">
                <TrendingDown className="h-4 w-4" />
                Despesas vencidas não pagas: {fmt(totalAPVencidas)}
              </div>
            </Link>
          )}
          {despesasPendentesAprovacao > 0 && (
            <Link href="/financeiro/despesas?status=PENDENTE">
              <div className="flex items-center gap-2 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 cursor-pointer hover:bg-yellow-500/20 transition-colors">
                <AlertTriangle className="h-4 w-4" />
                {despesasPendentesAprovacao} despesa{despesasPendentesAprovacao > 1 ? "s" : ""} aguardando aprovação
              </div>
            </Link>
          )}
          {receitasVencendoHoje > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-600">
              <TrendingUp className="h-4 w-4" />
              {receitasVencendoHoje} receita{receitasVencendoHoje > 1 ? "s" : ""} vencem hoje
            </div>
          )}
          {despesasVencendoHoje > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-600">
              <TrendingDown className="h-4 w-4" />
              {despesasVencendoHoje} despesa{despesasVencendoHoje > 1 ? "s" : ""} vencem hoje
            </div>
          )}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Total (Caixa)"
          value={fmt(saldoTotal)}
          icon={<Wallet className="h-5 w-5" />}
          description={`${contas.length} conta${contas.length !== 1 ? "s" : ""} ativa${contas.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Receitas do Mês"
          value={fmt(totalRecebido)}
          icon={<TrendingUp className="h-5 w-5" />}
          description={`${receitasMes._count} recebimento${receitasMes._count !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Despesas do Mês"
          value={fmt(totalPago)}
          icon={<TrendingDown className="h-5 w-5" />}
          description={`${despesasMes._count} pagamento${despesasMes._count !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Resultado do Mês"
          value={fmt(resultadoMes)}
          icon={<DollarSign className="h-5 w-5" />}
          description={resultadoMes >= 0 ? "Positivo" : "Negativo"}
        />
      </div>

      {/* ── A/R + A/P PANELS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* A/R — Contas a Receber */}
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Contas a Receber (A/R)</h2>
            <Link href="/invoices" className="text-xs text-brand-primary hover:underline">Ver invoices →</Link>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalAR)}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Em aberto (enviadas)</span>
              <span className="text-foreground font-medium">{fmt(Number(invoicesAR._sum.saldo ?? 0))} · {invoicesAR._count} invoice{invoicesAR._count !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={totalOverdue > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>Vencidas (urgente)</span>
              <span className={totalOverdue > 0 ? "text-destructive font-medium" : "text-foreground"}>
                {fmt(totalOverdue)} · {invoicesOverdue._count} invoice{invoicesOverdue._count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* A/P — Contas a Pagar */}
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Contas a Pagar (A/P)</h2>
            <Link href="/financeiro/despesas" className="text-xs text-brand-primary hover:underline">Ver despesas →</Link>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalAP)}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total a pagar</span>
              <span className="text-foreground font-medium">{expensesAP._count} despesa{expensesAP._count !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={totalAPVencidas > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>Já vencidas</span>
              <span className={totalAPVencidas > 0 ? "text-orange-600 font-medium" : "text-foreground"}>
                {fmt(totalAPVencidas)} · {expensesVencidas._count} despesa{expensesVencidas._count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PIPELINE DE PROJETOS ── */}
      {projetosAtivosCount > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Pipeline de Projetos Ativos</h2>
            <Link href="/projetos" className="text-xs text-brand-primary hover:underline">Ver projetos →</Link>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-foreground">{fmt(totalPipeline)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Valor de contrato total</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-2xl font-bold text-foreground">{projetosAtivosCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Projeto{projetosAtivosCount !== 1 ? "s" : ""} em andamento</p>
            </div>
          </div>
        </div>
      )}

      {/* ── BANK ACCOUNTS ── */}
      {contas.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Contas Bancárias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contas.map((conta) => (
              <Link key={conta.id} href={`/financeiro/contas/${conta.id}`}>
                <div className="rounded-2xl bg-card border border-border p-4 hover:border-brand-primary transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground truncate">{conta.nome}</span>
                    {conta.principal && (
                      <span className="text-xs bg-brand-primary/10 text-brand-primary rounded-full px-2 py-0.5">Principal</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{conta.banco} · {conta.tipo}</p>
                  <p className={`text-lg font-bold ${Number(conta.saldoAtual) < 0 ? "text-destructive" : "text-foreground"}`}>
                    {fmt(Number(conta.saldoAtual))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── QUICK LINKS ── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Receitas", href: "/financeiro/receitas", icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Despesas", href: "/financeiro/despesas", icon: <TrendingDown className="h-4 w-4" /> },
            { label: "Transferências", href: "/financeiro/transferencias", icon: <ArrowRightLeft className="h-4 w-4" /> },
            { label: "Relatórios", href: "/financeiro/relatorios", icon: <BarChart2 className="h-4 w-4" /> },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 hover:border-brand-primary transition-colors cursor-pointer">
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function FinanceiroPage() {
  const user = await requireServerUser();
  const role = user.role as Role;

  if (!can(role, "financeiro", "read")) redirect("/403");

  const empresaId: number = (user as unknown as { empresaId?: number }).empresaId ?? 1;
  const canCreate = can(role, "financeiro", "create");

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Financeiro"
        description="Controle total de receitas, despesas, contas e fluxo de caixa."
        icon={<DollarSign />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro" },
        ]}
        actions={
          canCreate ? (
            <div className="flex gap-2">
              <Link href="/financeiro/receitas/nova">
                <Button variant="outline" size="default">
                  <Plus className="h-4 w-4 mr-1" /> Receita
                </Button>
              </Link>
              <Link href="/financeiro/despesas/nova">
                <Button size="default">
                  <Plus className="h-4 w-4 mr-1" /> Despesa
                </Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />
            ))}
          </div>
        }
      >
        <FinanceiroDashboardContent empresaId={empresaId} />
      </Suspense>
    </div>
  );
}
