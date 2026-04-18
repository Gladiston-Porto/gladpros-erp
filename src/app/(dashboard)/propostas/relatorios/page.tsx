/**
 * Relatórios de Propostas — dados reais do banco
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { redirect } from "next/navigation";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader } from "@gladpros/ui/card";
import { ArrowLeft, FileBarChart, CheckCircle, TrendingUp, DollarSign } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  ASSINADA: "Assinada",
  APROVADA: "Aprovada",
  CANCELADA: "Cancelada",
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default async function RelatoriosPropostasPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "propostas", "read")) {
    redirect("/403");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    total,
    porStatus,
    aprovadas,
    novosEsteMes,
    valorPipeline,
    porMes,
  ] = await Promise.all([
    prisma.proposta.count({ where: { deletedAt: null } }),
    prisma.proposta.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { valorEstimado: true },
      where: { deletedAt: null },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.proposta.count({ where: { status: "APROVADA", deletedAt: null } }),
    prisma.proposta.count({ where: { criadoEm: { gte: startOfMonth }, deletedAt: null } }),
    prisma.proposta.aggregate({
      _sum: { valorEstimado: true },
      where: { status: { not: "CANCELADA" }, deletedAt: null },
    }),
    prisma.proposta.findMany({
      where: { criadoEm: { gte: sixMonthsAgo }, deletedAt: null },
      select: { criadoEm: true },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const taxaConversao = total > 0 ? ((aprovadas / total) * 100).toFixed(1) : "0.0";
  const valorPipelineNum = valorPipeline._sum.valorEstimado?.toNumber() ?? 0;

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
        title="Relatórios de Propostas"
        description="Análise de pipeline, conversão e valor das propostas"
        icon={<FileBarChart />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Propostas", href: "/propostas" },
          { label: "Relatórios" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/propostas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Propostas", value: total.toLocaleString("en-US"), icon: FileBarChart, color: "text-brand-secondary", bg: "bg-brand-secondary/10" },
          { label: "Aprovadas", value: aprovadas.toLocaleString("en-US"), icon: CheckCircle, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "Taxa de Conversão", value: `${taxaConversao}%`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Valor Total Pipeline", value: fmt(valorPipelineNum), icon: DollarSign, color: "text-brand-primary", bg: "bg-brand-primary/10" },
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
        {/* Funil por status */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Funil por Status</h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {porStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma proposta encontrada.</p>
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
                        className="h-full bg-brand-secondary rounded-full transition-all w-(--bar-pct)"
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
                  <span className="font-semibold text-green-600">{novosEsteMes}</span> novas propostas este mês
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Novos por mês */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Novas Propostas — Últimos 6 meses</h3>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-end gap-3 h-24">
              {mesesLista.map(([mes, count]) => (
                <div key={mes} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-medium text-foreground">{count}</span>
                  <div
                    className="w-full bg-brand-secondary/80 rounded-t-lg transition-all h-(--bar-h)"
                    style={{ "--bar-h": `${Math.max(6, (count / maxMes) * 64)}px` } as React.CSSProperties}
                  />
                  <span className="text-xs text-muted-foreground text-center leading-tight">{mes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
