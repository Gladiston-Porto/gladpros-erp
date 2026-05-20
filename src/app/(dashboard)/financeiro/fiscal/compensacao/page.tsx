import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Button } from "@gladpros/ui/button";
import { Badge } from "@gladpros/ui/badge";
import { StatCard } from "@gladpros/ui/stat-card";
import { FileText, Plus, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

async function CompensacaoContent({ empresaId }: { empresaId: number }) {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);

  const [empresa, totalAnual, compensacoes] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { tipoTributacao: true },
    }),
    prisma.ownerCompensation.aggregate({
      where: { empresaId, data: { gte: startOfYear } },
      _sum: { valor: true },
    }),
    prisma.ownerCompensation.findMany({
      where: { empresaId },
      select: {
        id: true,
        tipo: true,
        valor: true,
        data: true,
        descricao: true,
        worker: { select: { id: true, name: true } },
      },
      orderBy: { data: "desc" },
      take: 50,
    }),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const isSCorp = empresa?.tipoTributacao === "S_CORP";
  const salaryYTD = compensacoes
    .filter((c) => c.tipo === "SALARY" && new Date(c.data) >= startOfYear)
    .reduce((s, c) => s + Number(c.valor), 0);
  const distYTD = compensacoes
    .filter((c) => c.tipo === "DISTRIBUTION" && new Date(c.data) >= startOfYear)
    .reduce((s, c) => s + Number(c.valor), 0);
  const drawYTD = compensacoes
    .filter((c) => c.tipo === "OWNER_DRAW" && new Date(c.data) >= startOfYear)
    .reduce((s, c) => s + Number(c.valor), 0);

  const tipoLabel: Record<string, string> = {
    OWNER_DRAW: "Owner Draw",
    SALARY: "Salário",
    DISTRIBUTION: "Distribuição",
    BONUS: "Bônus",
    REIMBURSEMENT: "Reembolso",
  };

  const tipoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    OWNER_DRAW: "secondary",
    SALARY: "default",
    DISTRIBUTION: "outline",
    BONUS: "default",
    REIMBURSEMENT: "secondary",
  };

  // S-Corp warning: if no salary but has distribution
  const sCropViolation = isSCorp && salaryYTD === 0 && distYTD > 0;

  return (
    <div className="space-y-6">
      {sCropViolation && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive">IRS Violation — S-Corp</p>
            <p className="text-sm text-destructive/80 mt-0.5">
              Há distribuições ({fmt(distYTD)}) sem salário registrado no ano. S-Corp exige salário razoável antes de qualquer distribuição.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isSCorp ? (
          <>
            <StatCard
              title={`Salário YTD ${year}`}
              value={fmt(salaryYTD)}
              icon={<FileText className="h-5 w-5" />}
              description="S-Corp: sujeito a FICA"
              variant="default"
            />
            <StatCard
              title={`Distribuição YTD ${year}`}
              value={fmt(distYTD)}
              icon={<FileText className="h-5 w-5" />}
              description="S-Corp: não sujeito a SE tax"
              variant="default"
            />
            <StatCard
              title={`Total ${year}`}
              value={fmt(Number(totalAnual._sum.valor ?? 0))}
              icon={<FileText className="h-5 w-5" />}
              description="Salário + Distribuição"
              variant="default"
            />
          </>
        ) : (
          <>
            <StatCard
              title={`Owner Draw YTD ${year}`}
              value={fmt(drawYTD)}
              icon={<FileText className="h-5 w-5" />}
              description="LLC: não dedutível como despesa"
              variant="default"
            />
            <StatCard
              title={`Total ${year}`}
              value={fmt(Number(totalAnual._sum.valor ?? 0))}
              icon={<FileText className="h-5 w-5" />}
              description="Todas as retiradas do proprietário"
              variant="default"
            />
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Regime: LLC_DEFAULT</p>
              <p className="text-sm mt-1">Owner draws não são salário. Não impactam despesas dedutíveis.</p>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Histórico de Compensações</h2>
          <Link href="/financeiro/fiscal/compensacao/nova">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </Link>
        </div>

        {compensacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma compensação registrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Proprietário</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Descrição</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compensacoes.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(c.data).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={tipoVariant[c.tipo] ?? "secondary"}>
                        {tipoLabel[c.tipo] ?? c.tipo}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{c.worker?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-foreground">{c.descricao ?? "—"}</td>
                    <td className="px-6 py-3 text-right font-mono text-foreground">
                      {fmt(Number(c.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function CompensacaoPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const empresaId = (user as unknown as { empresaId?: number }).empresaId ?? 1;

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Compensação do Proprietário"
          description="Owner draw, salário e distribuição — LLC / S-Corp"
          icon={<FileText className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal", href: "/financeiro/fiscal" },
            { label: "Compensação" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <CompensacaoContent empresaId={empresaId} />
      </Suspense>
    </div>
  );
}
