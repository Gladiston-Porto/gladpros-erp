import { routeToModule, type Role } from "@/shared/lib/rbac-core"
import { canReadNavItem, filterNavGroupsByRole, type NavAccessGroup, type NavAccessItem } from "@/shared/lib/sidebar-rbac"

type TestNavItem = NavAccessItem & { label: string }
type TestNavGroup = NavAccessGroup<TestNavItem> & { title: string }

const labelsFor = (groups: TestNavGroup[]) => groups.flatMap((group) => group.items.map((item) => item.label))

describe("Navigation RBAC", () => {
  describe("routeToModule", () => {
    it("maps dashboard finance routes to financeiro before the generic dashboard module", () => {
      expect(routeToModule("/dashboard/financeiro")).toBe("financeiro")
      expect(routeToModule("/dashboard/financeiro/despesas")).toBe("financeiro")
      expect(routeToModule("/dashboard")).toBe("dashboard")
    })

    it("maps admin routes to configuracoes for explicit authorization decisions", () => {
      expect(routeToModule("/admin/eventos")).toBe("configuracoes")
      expect(routeToModule("/admin/integracao")).toBe("configuracoes")
      expect(routeToModule("/api/admin/events")).toBe("configuracoes")
    })
  })

  describe("canReadNavItem", () => {
    it("hides financeiro navigation from roles without financeiro read access", () => {
      const financeItem = { href: "/dashboard/financeiro/despesas" }

      expect(canReadNavItem(financeItem, "USUARIO")).toBe(false)
      expect(canReadNavItem(financeItem, "ESTOQUE")).toBe(false)
      expect(canReadNavItem(financeItem, "GERENTE")).toBe(true)
      expect(canReadNavItem(financeItem, "FINANCEIRO")).toBe(true)
    })

    it("hides unknown routes unless they are explicitly always visible", () => {
      expect(canReadNavItem({ href: "/rota-sem-mapeamento" }, "ADMIN")).toBe(false)
      expect(canReadNavItem({ href: "/perfil" }, "USUARIO")).toBe(true)
    })

    it("honors explicit role requirements for admin sidebar entries", () => {
      const adminItem = { href: "/admin/eventos", requiredRoles: ["ADMIN"] as Role[] }

      expect(canReadNavItem(adminItem, "ADMIN")).toBe(true)
      expect(canReadNavItem(adminItem, "GERENTE")).toBe(false)
      expect(canReadNavItem(adminItem, "FINANCEIRO")).toBe(false)
    })
  })

  describe("filterNavGroupsByRole", () => {
    const groups: TestNavGroup[] = [
      {
        title: "COMERCIAL",
        items: [
          { href: "/clientes", label: "Clientes" },
          { href: "/propostas", label: "Propostas" },
        ],
      },
      {
        title: "OPERAÇÃO",
        items: [
          { href: "/projetos", label: "Projetos" },
          { href: "/ordens-servico", label: "Ordens de Servico" },
          { href: "/documentos", label: "Documentos" },
        ],
      },
      {
        title: "ESTOQUE",
        items: [
          { href: "/estoque", label: "Estoque" },
        ],
      },
      {
        title: "GESTÃO",
        items: [
          { href: "/relatorios", label: "Relatorios Gerais" },
        ],
      },
      {
        title: "FINANCEIRO",
        items: [
          { href: "/dashboard/financeiro", label: "Visao Geral" },
          { href: "/dashboard/financeiro/despesas", label: "Despesas" },
          { href: "/dashboard/financeiro/relatorios", label: "Relatorios" },
        ],
      },
      {
        title: "FATURAMENTO",
        items: [
          { href: "/invoices", label: "Invoices" },
          { href: "/invoices/relatorios", label: "Relatorios de Invoices" },
        ],
      },
      {
        title: "FISCAL",
        items: [
          { href: "/dashboard/financeiro/fiscal", label: "Painel Fiscal" },
          { href: "/dashboard/financeiro/fiscal/compensacao", label: "Compensacao" },
        ],
      },
      {
        title: "SISTEMA",
        items: [
          { href: "/admin/eventos", label: "Eventos", requiredRoles: ["ADMIN"] },
          { href: "/admin/integracao", label: "Integracao", requiredRoles: ["ADMIN"] },
          { href: "/perfil", label: "Perfil" },
          { href: "/rota-sem-mapeamento", label: "Desconhecida" },
        ],
      },
    ]

    it("keeps finance items for financeiro users and hides admin-only items", () => {
      const filtered = filterNavGroupsByRole(groups, "FINANCEIRO")

      expect(labelsFor(filtered)).toEqual([
        "Clientes",
        "Propostas",
        "Projetos",
        "Ordens de Servico",
        "Documentos",
        "Estoque",
        "Relatorios Gerais",
        "Visao Geral",
        "Despesas",
        "Relatorios",
        "Invoices",
        "Relatorios de Invoices",
        "Painel Fiscal",
        "Compensacao",
        "Perfil",
      ])
    })

    it("hides finance and admin-only items from regular users", () => {
      const filtered = filterNavGroupsByRole(groups, "USUARIO")

      expect(labelsFor(filtered)).toEqual([
        "Clientes",
        "Projetos",
        "Ordens de Servico",
        "Documentos",
        "Estoque",
        "Invoices",
        "Relatorios de Invoices",
        "Perfil",
      ])
    })

    it("keeps commercial focused on sales and operation focused on execution", () => {
      expect(groups.find((group) => group.title === "COMERCIAL")?.items.map((item) => item.label)).toEqual([
        "Clientes",
        "Propostas",
      ])
      expect(groups.find((group) => group.title === "OPERAÇÃO")?.items.map((item) => item.label)).toEqual([
        "Projetos",
        "Ordens de Servico",
        "Documentos",
      ])
    })
  })
})
