/**
 * Relatórios de RH / Workers — dados reais do banco
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { redirect } from "next/navigation";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader } from "@gladpros/ui/card";
import { ArrowLeft, Users, UserCheck, UserX, TrendingUp } from "lucide-react";

export default async function RelatoriosRhPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "rh", "read")) {
    redirect("/403");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    total,
    ativos,
    inativos,
    porClassification,
    porTipo,
    novosEsteMes,
  ] = await Promise.all([
    prisma.worker.count(),
    prisma.worker.count({ where: { status: "ACTIVE" } }),
    prisma.worker.count({ where: { status: { in: ["INACTIVE", "SUSPENDED"] } } }),
    prisma.worker.groupBy({
      by: ["classification"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.worker.groupBy({
      by: ["type"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.worker.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  const classificationLabels: Record<string, string> = {
    W2_EMPLOYEE: "Empregado W2",
    CONTRACTOR_1099: "Contratado 1099",
    SUBCONTRACTOR: "Subcontratado",
    OWNER_OPERATOR: "Owner/Operador",
  };

  const tipoLabels: Record<string, string> = {
    INDIVIDUAL: "Individual",
    COMPANY: "Empresa",
  };

  const maxClassification = Math.max(...porClassification.map((c) => c._count.id), 1);
  const maxTipo = Math.max(...porTipo.map((t) => t._count.id), 1);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios de RH"
        description="Análise da força de trabalho e classificação de workers"
        icon={<Users />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "RH", href: "/rh" },
          { label: "Relatórios" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/rh">
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
                <Users className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Workers</p>
                <p className="text-xl font-bold text-foreground">{total.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-500/10 p-2">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-xl font-bold text-foreground">{ativos.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-yellow-500/10 p-2">
                <UserX className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inativos/Suspensos</p>
                <p className="text-xl font-bold text-foreground">{inativos.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-primary/10 p-2">
                <TrendingUp className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Novos este Mês</p>
                <p className="text-xl font-bold text-foreground">{novosEsteMes.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar chart por classification */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Por Classificação Fiscal</h3>
          </CardHeader>
          <CardContent className="pt-4">
            {porClassification.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum worker cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {porClassification.map((c) => (
                  <div key={c.classification} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-muted-foreground truncate">
                      {classificationLabels[c.classification] ?? c.classification}
                    </span>
                    <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all"
                        style={{ width: `${Math.round((c._count.id / maxClassification) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-right text-foreground font-medium">
                      {c._count.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart por tipo */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Por Tipo de Worker</h3>
          </CardHeader>
          <CardContent className="pt-4">
            {porTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum worker cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {porTipo.map((t) => (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-muted-foreground truncate">
                      {tipoLabels[t.type] ?? t.type}
                    </span>
                    <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all"
                        style={{ width: `${Math.round((t._count.id / maxTipo) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-right text-foreground font-medium">
                      {t._count.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Ativos vs Total */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader className="border-b border-border pb-3">
          <h3 className="font-title text-base font-semibold text-foreground">Ativos vs Inativos</h3>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {[
            { label: "Ativos", value: ativos, color: "bg-green-500" },
            { label: "Inativos / Suspensos", value: inativos, color: "bg-yellow-500" },
          ].map(({ label, value, color }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">
                    {value}{" "}
                    <span className="text-muted-foreground text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all w-(--bar-pct)`}
                    style={{ "--bar-pct": `${pct}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
