import Link from "next/link"
import { redirect } from "next/navigation"
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { can, type Role } from "@/shared/lib/rbac-core"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { ArrowRight, BarChart3, FileBarChart2, Receipt, Scale } from "lucide-react"

const reportLinks = [
  {
    title: "DRE",
    description: "Receitas, despesas e lucro líquido por período.",
    href: "/dashboard/financeiro/relatorios/dre",
    icon: FileBarChart2,
  },
  {
    title: "Balanço Patrimonial",
    description: "Ativos, passivos e patrimônio líquido.",
    href: "/dashboard/financeiro/relatorios/balanco",
    icon: Scale,
  },
  {
    title: "Relatórios Fiscais",
    description: "Schedule C, P&L, 1099 e comparativos trimestrais.",
    href: "/dashboard/financeiro/fiscal/relatorios",
    icon: BarChart3,
  },
  {
    title: "Relatórios de Invoices",
    description: "Análise de faturamento e cobrança.",
    href: "/invoices/relatorios",
    icon: Receipt,
  },
]

export default async function RelatoriosFinanceiroPage() {
  const user = await requireServerUser()

  if (!can(user.role as Role, "financeiro", "read")) {
    redirect("/403")
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios Financeiros"
        description="Central de relatórios financeiros, fiscais e de faturamento."
        icon={<BarChart3 />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro", href: "/dashboard/financeiro" },
          { label: "Relatórios" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reportLinks.map((report) => (
          <Card key={report.href} className="rounded-2xl border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-foreground">
                <span className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primary">
                  <report.icon className="h-5 w-5" />
                </span>
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{report.description}</p>
              <Button asChild variant="outline" size="default">
                <Link href={report.href}>
                  Abrir relatório
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
