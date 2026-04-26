/**
 * Relatórios de Invoices — dados reais do banco
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { redirect } from "next/navigation";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader } from "@gladpros/ui/card";
import { Badge } from "@gladpros/ui/badge";
import { ArrowLeft, FileText, DollarSign, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { DynamicBar } from "@/components/ui/dynamic-bar";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIAL_PAID: "Partial Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default async function RelatoriosInvoicesPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "invoices", "read")) {
    redirect("/403");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    total,
    porStatus,
    receitaRecebida,
    totalPendente,
    totalVencido,
    novosEsteMes,
    topClientesRaw,
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { valorTotal: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.invoice.aggregate({
      _sum: { valorTotal: true },
      where: { status: { in: ["PAID", "PARTIAL_PAID"] } },
    }),
    prisma.invoice.aggregate({
      _sum: { valorTotal: true },
      where: { status: { in: ["SENT", "VIEWED", "PARTIAL_PAID"] } },
    }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.invoice.count({ where: { dataEmissao: { gte: startOfMonth } } }),
    prisma.invoice.groupBy({
      by: ["clienteId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const clienteIds = topClientesRaw.map((r) => r.clienteId);
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, nomeCompleto: true },
  });
  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.nomeCompleto]));

  const topClientes = topClientesRaw.map((r) => ({
    nome: clienteMap[r.clienteId] ?? `Cliente #${r.clienteId}`,
    count: r._count.id,
  }));

  const receitaNum = receitaRecebida._sum.valorTotal?.toNumber() ?? 0;
  const pendenteNum = totalPendente._sum.valorTotal?.toNumber() ?? 0;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios de Invoices"
        description="Análise financeira e status das invoices emitidas"
        icon={<FileText />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Invoices", href: "/invoices" },
          { label: "Relatórios" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: total.toLocaleString("en-US"), icon: FileText, color: "text-brand-primary", bg: "bg-brand-primary/10" },
          { label: "Receita Recebida", value: fmt(receitaNum), icon: DollarSign, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "A Receber", value: fmt(pendenteNum), icon: Clock, color: "text-yellow-600", bg: "bg-yellow-500/10" },
          { label: "Vencidas", value: totalVencido.toLocaleString("en-US"), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição por status */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Distribuição por Status</h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {porStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma invoice encontrada.</p>
            ) : (
              porStatus.map(({ status, _count, _sum }) => {
                const pct = total > 0 ? Math.round((_count.id / total) * 100) : 0;
                const valor = _sum.valorTotal?.toNumber() ?? 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{STATUS_LABELS[status] ?? status}</span>
                      <span className="font-medium text-foreground">
                        {_count.id}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({pct}%) · {fmt(valor)}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <DynamicBar
                        value={pct}
                        className="h-full bg-brand-primary rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
            {novosEsteMes > 0 && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-green-600">{novosEsteMes}</span> novas invoices este mês
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 clientes */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Top 5 Clientes</h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {topClientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            ) : (
              topClientes.map(({ nome, count }, idx) => (
                <div key={nome} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="text-sm text-foreground truncate max-w-[180px]">{nome}</span>
                  </div>
                  <Badge variant="default">{count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exportar */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">Exportar Relatório</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Exporte os dados de invoices para análise externa ou arquivo fiscal.
          </p>
          <Button variant="outline" size="default" asChild>
            <Link href="/api/reports/invoices/pdf">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
