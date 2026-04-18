// src/app/(dashboard)/relatorios/page.tsx — Hub de Relatórios
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { can, type Role } from "@/shared/lib/rbac-core"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { Card, CardContent } from "@gladpros/ui/card"
import {
  FileBarChart,
  Users,
  ScrollText,
  Briefcase,
  Package,
  DollarSign,
  Receipt,
  ClipboardList,
  ChevronRight,
} from "lucide-react"

export default async function RelatoriosHubPage() {
  const user = await requireServerUser()
  if (!can(user.role as Role, "reports", "read")) redirect("/403")

  const modulos = [
    {
      href: "/clientes/relatorios",
      label: "Clientes",
      description: "Análise de base de clientes, distribuição por estado e atividade recente",
      icon: Users,
      color: "#0098DA",
      module: "clientes" as const,
    },
    {
      href: "/propostas/relatorios",
      label: "Propostas",
      description: "Taxa de aprovação, volume mensal e análise de desempenho comercial",
      icon: ScrollText,
      color: "#FF8C00",
      module: "propostas" as const,
    },
    {
      href: "/projetos/relatorios",
      label: "Projetos",
      description: "Status de execução, projetos em atraso e taxa de conclusão",
      icon: Briefcase,
      color: "#10B981",
      module: "projetos" as const,
    },
    {
      href: "/ordens-servico/relatorios",
      label: "Ordens de Serviço",
      description: "Ordens por status, volume mensal e ordens agendadas",
      icon: ClipboardList,
      color: "#FF8C00",
      module: "service-orders" as const,
    },
    {
      href: "/estoque/relatorios",
      label: "Estoque",
      description: "Valor em estoque, itens críticos e movimentações recentes",
      icon: Package,
      color: "#7C3AED",
      module: "estoque" as const,
    },
    {
      href: "/financeiro/relatorios",
      label: "Financeiro",
      description: "Receitas, despesas, saldo e fluxo de caixa mensal",
      icon: DollarSign,
      color: "#10B981",
      module: "financeiro" as const,
    },
    {
      href: "/invoices/relatorios",
      label: "Invoices",
      description: "Receita faturada, invoices em aberto e vencidas",
      icon: Receipt,
      color: "#0098DA",
      module: "invoices" as const,
    },
    {
      href: "/rh/relatorios",
      label: "Recursos Humanos",
      description: "Headcount, workers ativos e distribuição por classificação",
      icon: Users,
      color: "#FF8C00",
      module: "rh" as const,
    },
  ]

  const acessiveis = modulos.filter((m) =>
    can(user.role as Role, m.module, "read")
  )

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Relatórios"
        description={`${acessiveis.length} módulos disponíveis para análise`}
        icon={<FileBarChart />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Relatórios" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {acessiveis.map((mod) => {
          const Icon = mod.icon
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="border-border rounded-2xl hover:border-brand-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                        style={{ backgroundColor: `${mod.color}15` }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: mod.color }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm group-hover:text-brand-primary transition-colors">
                          {mod.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-brand-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
