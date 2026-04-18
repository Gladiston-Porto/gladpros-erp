/**
 * Relatórios Financeiros — dados reais do banco
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { redirect } from "next/navigation";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader } from "@gladpros/ui/card";
import { ArrowLeft, FileBarChart, DollarSign, Clock, Calendar, TrendingDown } from "lucide-react";

export default async function RelatoriosFinanceiroPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) {
    redirect("/403");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    total,
    totalPagoResult,
    totalPendenteResult,
    totalMesResult,
    porStatus,
    porTipo,
    novosEsteMes,
  ] = await Promise.all([
    prisma.expense.count(),
    prisma.expense.aggregate({
      _sum: { valor: true },
      where: { status: "PAGA" },
    }),
    prisma.expense.aggregate({
      _sum: { valor: true },
      where: { status: { in: ["PENDENTE", "AGUARDANDO_APROVACAO", "APROVADA"] } },
    }),
    prisma.expense.aggregate({
      _sum: { valor: true },
      where: {
        dataEmissao: { gte: startOfMonth },
        status: { not: "CANCELADA" },
      },
    }),
    prisma.expense.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { valor: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.expense.groupBy({
      by: ["tipo"],
      _count: { id: true },
      _sum: { valor: true },
      orderBy: { _sum: { valor: "desc" } },
      take: 6,
    }),
    prisma.expense.count({ where: { criadoEm: { gte: startOfMonth } } }),
  ]);

  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  const totalPago = totalPagoResult._sum.valor?.toNumber() ?? 0;
  const totalPendente = totalPendenteResult._sum.valor?.toNumber() ?? 0;
  const totalMes = totalMesResult._sum.valor?.toNumber() ?? 0;

  const statusLabels: Record<string, string> = {
    PENDENTE: "Pendente",
    AGUARDANDO_APROVACAO: "Aguard. Aprovação",
    APROVADA: "Aprovada",
    REJEITADA: "Rejeitada",
    PAGA: "Paga",
    CANCELADA: "Cancelada",
  };

  const tipoLabels: Record<string, string> = {
    OPERACIONAL: "Operacional",
    ADMINISTRATIVA: "Administrativa",
    PESSOAL: "Pessoal",
    MARKETING: "Marketing",
    TECNOLOGIA: "Tecnologia",
    IMPOSTOS: "Impostos",
    ALUGUEL: "Aluguel",
    SERVIÇOS: "Serviços",
    FORNECEDORES: "Fornecedores",
    OUTROS: "Outros",
  };

  const maxTipoValor = Math.max(...porTipo.map((t) => t._sum.valor?.toNumber() ?? 0), 1);
  const maxStatusCount = Math.max(...porStatus.map((s) => s._count.id), 1);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios Financeiros"
        description="Análise de despesas e pagamentos"
        icon={<DollarSign />}
        accentColor="#16a34a"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro", href: "/financeiro" },
          { label: "Relatórios" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/financeiro">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-primary/10 p-2">
                <FileBarChart className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Despesas</p>
                <p className="text-xl font-bold text-foreground">{total.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-500/10 p-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pago</p>
                <p className="text-xl font-bold text-foreground">{usd.format(totalPago)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-yellow-500/10 p-2">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold text-foreground">{usd.format(totalPendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-primary/10 p-2">
                <Calendar className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas este mês</p>
                <p className="text-xl font-bold text-foreground">{usd.format(totalMes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar chart por tipo */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Despesas por Tipo</h3>
          </CardHeader>
          <CardContent className="pt-4">
            {porTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
            ) : (
              <div className="space-y-2">
                {porTipo.map((t) => {
                  const valor = t._sum.valor?.toNumber() ?? 0;
                  return (
                    <div key={t.tipo} className="flex items-center gap-3">
                      <span className="w-32 text-xs text-muted-foreground truncate">
                        {tipoLabels[t.tipo] ?? t.tipo}
                      </span>
                      <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-primary transition-all"
                          style={{ width: `${Math.round((valor / maxTipoValor) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 text-xs text-right text-foreground font-medium">
                        {usd.format(valor)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart por status */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Despesas por Status</h3>
          </CardHeader>
          <CardContent className="pt-4">
            {porStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
            ) : (
              <div className="space-y-2">
                {porStatus.map((s) => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-muted-foreground truncate">
                      {statusLabels[s.status] ?? s.status}
                    </span>
                    <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all"
                        style={{ width: `${Math.round((s._count.id / maxStatusCount) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-right text-foreground font-medium">
                      {s._count.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo */}
      {novosEsteMes > 0 && (
        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-2">
              <TrendingDown className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{novosEsteMes}</span> despesas registradas este mês
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
