/**
 * Relatórios de Ordens de Serviço — dados reais do banco
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
import { ClipboardList, Download, PlayCircle, Calendar, CheckCircle, TrendingUp } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em Execução",
  COMPLETED: "Concluída",
  AWAITING_PAYMENT: "Ag. Pagamento",
  CLOSED: "Encerrada",
  WRITE_OFF: "Baixada",
  CANCELED: "Cancelada",
};

export default async function RelatoriosOrdensServicoPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "service-orders", "read")) redirect("/403");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [total, porStatus, agendadas, emExecucao, novosEsteMes, concluidasEsteMes, porMes] =
    await Promise.all([
      prisma.serviceOrder.count(),
      prisma.serviceOrder.groupBy({ by: ["status"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      prisma.serviceOrder.count({ where: { status: "SCHEDULED" } }),
      prisma.serviceOrder.count({ where: { status: "IN_PROGRESS" } }),
      prisma.serviceOrder.count({ where: { criadoEm: { gte: startOfMonth } } }),
      prisma.serviceOrder.count({ where: { status: "COMPLETED", criadoEm: { gte: startOfMonth } } }),
      prisma.serviceOrder.findMany({
        where: { criadoEm: { gte: sixMonthsAgo } },
        select: { criadoEm: true },
        orderBy: { criadoEm: "asc" },
      }),
    ]);

  const mesesMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Chicago" });
    mesesMap[key] = 0;
  }
  for (const os of porMes) {
    const key = os.criadoEm.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Chicago" });
    if (key in mesesMap) mesesMap[key] = (mesesMap[key] ?? 0) + 1;
  }
  const mesesLista = Object.entries(mesesMap);
  const maxMes = Math.max(...mesesLista.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios de Ordens de Serviço"
        description="Análise e exportação das ordens de serviço"
        icon={<ClipboardList />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Ordens de Serviço", href: "/ordens-servico" },
          { label: "Relatórios" },
        ]}
        actions={
          <Link href="/ordens-servico/relatorios">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
          </Link>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total OS", value: total, icon: ClipboardList, color: "text-brand-secondary", bg: "bg-brand-secondary/10" },
          { label: "Em Execução", value: emExecucao, icon: PlayCircle, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Agendadas", value: agendadas, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-500/10" },
          { label: "Concluídas este mês", value: concluidasEsteMes, icon: CheckCircle, color: "text-green-600", bg: "bg-green-500/10" },
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
        {/* Distribuição por Status — bar chart inline CSS */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Distribuição por Status</h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {porStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço cadastrada ainda.</p>
            ) : (
              porStatus.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-muted-foreground truncate">{STATUS_LABELS[s.status] ?? s.status}</span>
                  <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-secondary transition-all"
                      style={{ width: `${Math.round((s._count.id / Math.max(total, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-right text-foreground font-medium">{s._count.id}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Indicadores Rápidos */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Indicadores Rápidos</h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[
              { label: "Total de OS", value: total, color: "text-foreground" },
              { label: "Em Execução", value: emExecucao, color: "text-blue-600" },
              { label: "Agendadas", value: agendadas, color: "text-yellow-600" },
              { label: "Concluídas este mês", value: concluidasEsteMes, color: "text-green-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge variant="default" className={color}>{value.toLocaleString("en-US")}</Badge>
              </div>
            ))}
            {novosEsteMes > 0 && (
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-green-600">{novosEsteMes}</span> novas OS este mês
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Novas OS por Mês */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">Novas OS — Últimos 6 meses</h3>
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

      {/* Exportações */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">Exportar Ordens de Serviço</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Exporte a base completa de ordens de serviço nos formatos abaixo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/ordens-servico">
              <Button variant="outline" size="default">
                <Download className="h-4 w-4 mr-2" />
                Ir para Lista e Exportar CSV
              </Button>
            </Link>
            <Link href="/ordens-servico/relatorios">
              <Button variant="outline" size="default">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
