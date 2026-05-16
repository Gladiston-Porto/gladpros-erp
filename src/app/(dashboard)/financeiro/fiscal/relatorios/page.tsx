import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { Suspense } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { BarChart2, FileText, DollarSign, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const fiscalReports = [
  {
    title: "Schedule C",
    description: "Relatório IRS Schedule C — lucro/prejuízo de negócio autônomo (LLC). Linhas de receita e despesas dedutíveis.",
    href: "/api/financeiro/reports/schedule-c",
    icon: <DollarSign className="h-6 w-6" />,
    tag: "LLC",
  },
  {
    title: "Sumário 1099-NEC",
    description: "Lista de prestadores que receberam $600+ no ano. Obrigatório para declaração IRS 1099-NEC.",
    href: "/api/financeiro/reports/1099-summary",
    icon: <FileText className="h-6 w-6" />,
    tag: "1099",
  },
  {
    title: "Imposto Tax / Regime",
    description: "Configuração e informações do regime fiscal da empresa (LLC ou S-Corp election).",
    href: "/api/financeiro/tax/regime",
    icon: <BarChart2 className="h-6 w-6" />,
    tag: "Regime",
  },
];

export default async function RelatoriosFiscaisPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Relatórios Fiscais"
          description="Schedule C, 1099 e declarações IRS"
          icon={<BarChart2 className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal", href: "/financeiro/fiscal" },
            { label: "Relatórios" },
          ]}
          className="text-white"
        />
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 rounded-2xl bg-muted" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fiscalReports.map((r) => (
            <a
              key={r.href}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border bg-card p-6 hover:border-brand-primary/50 hover:bg-muted/20 transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  {r.icon}
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {r.tag}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-brand-primary transition-colors">
                  {r.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
              </div>
              <div className="flex items-center gap-1 text-brand-primary text-sm font-medium mt-auto">
                Gerar
                <ArrowRight className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-2">Impostos Estimados Trimestrais</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Calcule e acompanhe os pagamentos trimestrais ao IRS para evitar multas.
          </p>
          <Link
            href="/financeiro/fiscal/impostos-estimados"
            className="inline-flex items-center gap-2 text-brand-primary hover:underline text-sm font-medium"
          >
            Ver Impostos Estimados
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Suspense>
    </div>
  );
}
