import { redirect } from "next/navigation";
import Link from "next/link";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { FileText, DollarSign, Tag, ArrowRight, BarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

const fiscalItems = [
  {
    title: "Impostos Estimados",
    description: "Cálculo de impostos trimestrais estimados (LLC / S-Corp). IRS quarterly estimates.",
    href: "/financeiro/fiscal/impostos-estimados",
    icon: <DollarSign className="h-6 w-6" />,
  },
  {
    title: "Compensação do Proprietário",
    description: "Owner draw (LLC) e salário/distribuição (S-Corp). Controle de retiradas do dono.",
    href: "/financeiro/fiscal/compensacao",
    icon: <FileText className="h-6 w-6" />,
  },
  {
    title: "Categorias de Despesa",
    description: "Categorias mapeadas para Schedule C. Classificação para fins fiscais.",
    href: "/financeiro/fiscal/categorias",
    icon: <Tag className="h-6 w-6" />,
  },
  {
    title: "Relatórios Fiscais",
    description: "Schedule C, 1099-NEC summary e relatórios para o contador.",
    href: "/financeiro/fiscal/relatorios",
    icon: <BarChart2 className="h-6 w-6" />,
  },
];

export default async function FiscalPage() {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  return (
    <div className="space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <ModulePageHeader
          title="Módulo Fiscal"
          description="Gestão tributária — LLC / S-Corp (Texas)"
          icon={<FileText className="h-6 w-6 text-white" />}
          breadcrumbs={[
            { label: "Financeiro", href: "/financeiro" },
            { label: "Fiscal" },
          ]}
          className="text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fiscalItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-border bg-card p-6 hover:border-brand-primary/50 hover:bg-muted/20 transition-all flex flex-col gap-3"
          >
            <div className="h-12 w-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
              {item.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-brand-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
            <div className="flex items-center gap-1 text-brand-primary text-sm font-medium mt-auto">
              Acessar
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
