/**
 * Relatórios de Projetos — dados reais do banco
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { redirect } from "next/navigation";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader } from "@gladpros/ui/card";
import { ArrowLeft, Briefcase, PlayCircle, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  planejado: "Planejado",
  em_execucao: "Em Execução",
  em_inspecao: "Em Inspeção",
  aguardando_devolucoes: "Ag. Devoluções",
  concluido: "Concluído",
  arquivado: "Arquivado",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default async function RelatoriosProjetosPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "projetos", "read")) {
    redirect("/403");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    total,
    porStatus,
    emExecucao,
    concluidos,
    atrasados,
    valorEstimadoTotal,
    novosEsteMes,
    porMes,
  ] = await Promise.all([
    prisma.projeto.count(),
    prisma.projeto.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { valorEstimado: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.projeto.count({ where: { status: "em_execucao" } }),
    prisma.projeto.count({ where: { status: "concluido" } }),
    prisma.projeto.count({
      where: {
        dataConclusaoPrevista: { lt: now },
        status: { notIn: ["concluido", "arquivado", "cancelado"] },
      },
    }),
    prisma.projeto.aggregate({
      _sum: { valorEstimado: true },
      where: { status: { notIn: ["cancelado", "arquivado"] } },
    }),
    prisma.projeto.count({ where: { criadoEm: { gte: startOfMonth } } }),
    prisma.projeto.findMany({
      where: { criadoEm: { gte: sixMonthsAgo } },
      select: { criadoEm: true },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const valorNum = valorEstimadoTotal._sum.valorEstimado?.toNumber() ?? 0;

  // Agrupar por mês — últimos 6 meses
  const mesesMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Chicago" });
    mesesMap[key] = 0;
  }
  for (const p of porMes) {
    const key = p.criadoEm.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Chicago" });
    if (key in mesesMap) mesesMap[key] = (mesesMap[key] ?? 0) + 1;
  }
  const mesesLista = Object.entries(mesesMap);
  const maxMes = Math.max(...mesesLista.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios de Projetos"
        description="Visão geral de execução, prazo e valor dos projetos"
        icon={<Briefcase />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projetos", href: "/projetos" },
          { label: "Relatórios" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/projetos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Projetos", value: total.toLocaleString("en-US"), icon: Briefcase, color: "text-brand-primary", bg: "bg-brand-primary/10" },
          { label: "Em Execução", value: emExecucao.toLocaleString("en-US"), icon: PlayCircle, color: "text-brand-primary", bg: "bg-brand-primary/10" },
          { label: "Concluídos", value: concluidos.toLocaleString("en-US"), icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "Atrasados", value: atrasados.toLocaleString("en-US"), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
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
              <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>
            ) : (
              porStatus.map(({ status, _count, _sum }) => {
                const pct = total > 0 ? Math.round((_count.id / total) * 100) : 0;
                const valor = _sum.valorEstimado?.toNumber() ?? 0;
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
                      <div
                        className="h-full bg-brand-primary rounded-full transition-all w-(--bar-pct)"
                        style={{ "--bar-pct": `${pct}%` } as React.CSSProperties}
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
                  <span className="font-semibold text-green-600">{novosEsteMes}</span> novos projetos este mês
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Novos por mês */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Novos Projetos — Últimos 6 meses</h3>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-end gap-3 h-24">
              {mesesLista.map(([mes, count]) => (
                <div key={mes} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-medium text-foreground">{count}</span>
                  <div
                    className="w-full bg-brand-primary/80 rounded-t-lg transition-all h-(--bar-h)"
                    style={{ "--bar-h": `${Math.max(6, (count / maxMes) * 64)}px` } as React.CSSProperties}
                  />
                  <span className="text-xs text-muted-foreground text-center leading-tight">{mes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Valor total estimado */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">Valor Estimado Total (ativos)</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-3xl font-bold text-brand-primary">{fmt(valorNum)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Soma do valor estimado de todos os projetos ativos (excluindo cancelados e arquivados).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
