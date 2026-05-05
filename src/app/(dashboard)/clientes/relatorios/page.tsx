/**
 * Relatórios de Clientes — dados reais do banco
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
import { ArrowLeft, FileBarChart, Download, Users, UserCheck, Building2, User, TrendingUp } from "lucide-react";

export default async function RelatoriosClientesPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "clientes", "read")) {
    redirect("/403");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalClientes,
    ativos,
    inativos,
    porTipo,
    novosEsteMes,
    porEstado,
    porMes,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { status: "ATIVO" } }),
    prisma.cliente.count({ where: { status: "INATIVO" } }),
    prisma.cliente.groupBy({ by: ["tipo"], _count: { id: true } }),
    prisma.cliente.count({ where: { criadoEm: { gte: startOfMonth } } }),
    prisma.cliente.groupBy({
      by: ["addressState"],
      _count: { id: true },
      where: { addressState: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.cliente.findMany({
      where: { criadoEm: { gte: sixMonthsAgo } },
      select: { criadoEm: true },
      orderBy: { criadoEm: "asc" },
      take: 1000,
    }),
  ]);

  const totalPF = porTipo.find((t) => t.tipo === "PF")?._count.id ?? 0;
  const totalPJ = porTipo.find((t) => t.tipo === "PJ")?._count.id ?? 0;

  // Agrupar registros por mês
  const mesesMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Chicago" });
    mesesMap[key] = 0;
  }
  for (const c of porMes) {
    const key = c.criadoEm.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Chicago" });
    if (key in mesesMap) mesesMap[key] = (mesesMap[key] ?? 0) + 1;
  }
  const mesesLista = Object.entries(mesesMap);
  const maxMes = Math.max(...mesesLista.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios de Clientes"
        description="Análise e exportação da base de clientes"
        icon={<FileBarChart />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clientes", href: "/clientes" },
          { label: "Relatórios" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Clientes", value: totalClientes, icon: Users, color: "text-brand-primary", bg: "bg-brand-primary/10" },
          { label: "Ativos", value: ativos, icon: UserCheck, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "Pessoas Físicas", value: totalPF, icon: User, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Pessoas Jurídicas", value: totalPJ, icon: Building2, color: "text-purple-600", bg: "bg-purple-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value.toLocaleString("en-US")}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ativos vs Inativos */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Status dos Clientes</h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[
              { label: "Ativos", value: ativos, total: totalClientes, color: "bg-green-500" },
              { label: "Inativos", value: inativos, total: totalClientes, color: "bg-muted-foreground/40" },
            ].map(({ label, value, total, color }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all w-(--bar-pct)`}
                      style={{ '--bar-pct': `${pct}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
            {novosEsteMes > 0 && (
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-green-600">{novosEsteMes}</span> novos clientes este mês
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top estados */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Clientes por Estado</h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {porEstado.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum estado cadastrado ainda.</p>
            ) : (
              porEstado.map(({ addressState, _count }) => (
                <div key={addressState ?? "—"} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{addressState || "Não informado"}</span>
                  <Badge variant="default">{_count.id}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Novos por Mês */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">Novos Clientes — Últimos 6 meses</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3 h-24">
            {mesesLista.map(([mes, count]) => (
              <div key={mes} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-medium text-foreground">{count}</span>
                <div
                  className="w-full bg-brand-primary/80 rounded-t-lg transition-all h-(--bar-h)"
                  style={{ '--bar-h': `${Math.max(6, (count / maxMes) * 64)}px` } as React.CSSProperties}
                />
                <span className="text-xs text-muted-foreground text-center leading-tight">{mes}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exportações */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">Exportar Base de Clientes</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Exporte a base completa de clientes nos formatos abaixo. Os filtros ativos na lista de clientes são respeitados.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/clientes/lista">
              <Button variant="outline" size="default">
                <Download className="h-4 w-4 mr-2" />
                Ir para Lista e Exportar CSV
              </Button>
            </Link>
            <Link href="/clientes/lista">
              <Button variant="outline" size="default">
                <Download className="h-4 w-4 mr-2" />
                Ir para Lista e Exportar PDF
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
