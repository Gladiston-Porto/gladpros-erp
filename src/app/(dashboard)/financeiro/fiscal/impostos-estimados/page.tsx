import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { DollarSign, AlertTriangle, Info } from "lucide-react";

export const dynamic = "force-dynamic";

async function ImpostosEstimadosContent({ empresaId }: { empresaId: number }) {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);

  const [empresa, receitasAno, despesasAno, compensacoes] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nome: true, tipoTributacao: true },
    }),
    prisma.revenue.aggregate({
      where: { empresaId, status: "RECEBIDA", dataVencimento: { gte: startOfYear } },
      _sum: { valor: true },
    }),
    prisma.expense.aggregate({
      where: {
        empresaId,
        status: "PAGA",
        dataVencimento: { gte: startOfYear },
        // Only deductible expenses reduce taxable income
      },
      _sum: { valor: true },
    }),
    prisma.ownerCompensation.findMany({
      where: { empresaId, data: { gte: startOfYear } },
      select: { tipo: true, valor: true },
    }),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const grossRevenue = Number(receitasAno._sum.valor ?? 0);
  const totalExpenses = Number(despesasAno._sum.valor ?? 0);
  const netIncome = grossRevenue - totalExpenses;

  // IRS quarterly due dates
  const quarters = [
    { q: "Q1", due: `April 15, ${year}`, months: "Jan–Mar" },
    { q: "Q2", due: `June 16, ${year}`, months: "Apr–May" },
    { q: "Q3", due: `September 15, ${year}`, months: "Jun–Aug" },
    { q: "Q4", due: `January 15, ${year + 1}`, months: "Sep–Dec" },
  ];

  // LLC DEFAULT: SE tax 15.3% on net income, income tax ~22% federal (estimate)
  const isSCorp = empresa?.tipoTributacao === "S_CORP";
  const salarySCorp = compensacoes
    .filter((c) => c.tipo === "SALARY")
    .reduce((s, c) => s + Number(c.valor), 0);

  const seTaxRate = isSCorp ? 0 : 0.153;
  const seTax = netIncome > 0 ? netIncome * seTaxRate : 0;
  const federalIncomeTax = netIncome > 0 ? netIncome * 0.22 : 0; // Estimated 22% bracket
  const totalEstimated = seTax + federalIncomeTax;
  const perQuarter = totalEstimated / 4;

  return (
    <div className="space-y-6">
      {/* Regime */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <Info className="h-5 w-5 text-brand-primary shrink-0" />
        <div>
          <p className="text-sm text-foreground">
            Regime tributário: <span className="font-semibold">{empresa?.tipoTributacao ?? "LLC_DEFAULT"}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {isSCorp
              ? "S-Corp: FICA aplica-se apenas ao salário. Distribuições não são sujeitas a SE tax."
              : "LLC: Self-employment tax (15.3%) aplica-se sobre lucro líquido."}
          </p>
        </div>
      </div>

      {/* Income summary */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h3 className="font-semibold text-foreground mb-2">Base de Cálculo {year} (YTD)</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Receita bruta recebida</span>
          <span className="font-mono text-foreground">{fmt(grossRevenue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">- Despesas dedutíveis pagas</span>
          <span className="font-mono text-destructive">- {fmt(totalExpenses)}</span>
        </div>
        {isSCorp && salarySCorp > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">- Salário do proprietário (S-Corp)</span>
            <span className="font-mono text-destructive">- {fmt(salarySCorp)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-semibold text-foreground">Lucro líquido estimado</span>
          <span className={`font-mono font-bold ${netIncome >= 0 ? "text-green-500" : "text-destructive"}`}>
            {fmt(netIncome)}
          </span>
        </div>
      </div>

      {/* Tax estimates */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h3 className="font-semibold text-foreground mb-2">Estimativa de Imposto Federal</h3>
        {!isSCorp && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">SE Tax ({pct(seTaxRate)})</span>
            <span className="font-mono text-foreground">{fmt(seTax)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Federal Income Tax (~22% estimado)</span>
          <span className="font-mono text-foreground">{fmt(federalIncomeTax)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-semibold text-foreground">Total estimado (anual)</span>
          <span className="font-mono font-bold text-foreground">{fmt(totalEstimated)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Por trimestre</span>
          <span className="font-mono text-foreground font-semibold">{fmt(perQuarter)}</span>
        </div>
      </div>

      {/* Quarterly deadlines */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Prazos Trimestrais IRS {year}</h3>
        </div>
        <div className="divide-y divide-border">
          {quarters.map((q) => (
            <div key={q.q} className="flex items-center justify-between px-6 py-3">
              <div>
                <span className="font-semibold text-foreground">{q.q}</span>
                <span className="text-muted-foreground text-sm ml-2">({q.months})</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground">{q.due}</p>
                <p className="text-xs text-muted-foreground font-mono">{fmt(perQuarter)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Valores estimados. Consulte um contador certificado (CPA) para cálculo exato conforme sua situação fiscal individual.
        </p>
      </div>
    </div>
  );
}

export default async function ImpostosEstimadosPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const empresaId = (user as unknown as { empresaId?: number }).empresaId ?? 1;

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Impostos Estimados"
          description="IRS quarterly estimated taxes — LLC / S-Corp"
          icon={<DollarSign className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal", href: "/financeiro/fiscal" },
            { label: "Impostos Estimados" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <ImpostosEstimadosContent empresaId={empresaId} />
      </Suspense>
    </div>
  );
}
