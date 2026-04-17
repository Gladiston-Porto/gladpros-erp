# Page Patterns

> **v3.1** — Padrão atual usa `ModulePageHeader` (não `bg-hero-gradient` em páginas internas).

5 layouts padrão usados em todo o GladPros.

## 1. Dashboard Page
Para: dashboard principal, dashboard financeiro, visões gerais de módulo

```
┌─────────────────────────────────────┐
│ ModulePageHeader                    │
│   title + description + icon        │
│   accentColor="#0098DA"             │
│   breadcrumbs + actions             │
├─────────────────────────────────────┤
│ Stats Grid (1→2→4 cols)            │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│ │KPI │ │KPI │ │KPI │ │KPI │       │
│ └────┘ └────┘ └────┘ └────┘       │
├─────────────────────────────────────┤
│ Charts Grid (1→2 cols)             │
│ ┌───────────┐ ┌───────────┐       │
│ │ Chart     │ │ Chart     │       │
│ └───────────┘ └───────────┘       │
├─────────────────────────────────────┤
│ Atividade Recente / Tabela          │
└─────────────────────────────────────┘
```

**Stats:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` — usar `StatCard` de `@gladpros/ui/stat-card`  
**Charts:** `grid-cols-1 lg:grid-cols-2 gap-6`

## 2. Listing Page
Para: clientes, usuários, projetos, itens de estoque, propostas

```
┌─────────────────────────────────────┐
│ ModulePageHeader                    │
│   title + icon + breadcrumbs        │
│   actions: <Button>Novo</Button>    │
├─────────────────────────────────────┤
│ Stats Cards (opcional, 1→2→4 cols) │
├─────────────────────────────────────┤
│ Card                                │
│ ┌─ CardHeader ─────────────────────┐│
│ │ Search + Filters + Export        ││
│ ├─ CardContent ────────────────────┤│
│ │ Table (colunas ordenáveis)       ││
│ │  Row actions: editar, excluir... ││
│ ├──────────────────────────────────┤│
│ │ AdvancedPagination               ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Vazio:** Substituir tabela por `EmptyState` quando sem resultados.  
**Carregando:** Substituir tabela por linhas `Skeleton`.

## 3. Form Page
Para: criar/editar cliente, usuário, projeto, proposta

```
┌─────────────────────────────────────┐
│ ModulePageHeader                    │
│   title + icon + breadcrumbs        │
├─────────────────────────────────────┤
│ Card                                │
│ ┌─ Seção 1 ────────────────────────┐│
│ │ Grid (1→2 cols) de campos        ││
│ │ Input + Label + Error (inline)   ││
│ ├─ Seção 2 ────────────────────────┤│
│ │ Mais campos...                   ││
│ ├──────────────────────────────────┤│
│ │ Ações: Cancelar + Salvar         ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Key:** `react-hook-form` + `zodResolver`, inputs de `@gladpros/ui/*`, erros de validação inline abaixo de cada campo.

## 4. Detail Page
Para: detalhe de cliente, projeto, proposta

```
┌─────────────────────────────────────┐
│ ModulePageHeader                    │
│   title + icon + breadcrumbs        │
│   actions: Editar / Excluir         │
├─────────────────────────────────────┤
│ Summary Card (info principal + status)│
├─────────────────────────────────────┤
│ Tabs                                │
│ ┌─ Tab 1 ──┐ Tab 2 ┐ Tab 3 ┐      │
│ ├──────────────────────────────────┤│
│ │ Conteúdo por tab                 ││
│ │ - Grid de info, histórico, docs  ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 5. Portal Page (Público)
Para: portal do cliente, aceite de proposta, páginas públicas

```
┌─────────────────────────────────────┐
│ Header público (sem sidebar)        │
│ Logo + nav mínima                   │
├─────────────────────────────────────┤
│ bg-hero-gradient (✅ aqui é correto)│
│ Conteúdo (centralizado, max-w-4xl)  │
│ Card com layout limpo               │
├─────────────────────────────────────┤
│ Footer                              │
└─────────────────────────────────────┘
```

**Key:** Sem `DashboardShell`, layout standalone, conteúdo centralizado.  
**`bg-hero-gradient` é permitido aqui** — é o único lugar que faz sentido visualmente.

## Estrutura padrão de código — Módulo Interno
```tsx
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { can, type Role } from "@/shared/lib/rbac-core"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { Button } from "@gladpros/ui/button"
import { Skeleton } from "@gladpros/ui/skeleton"
import { SomeIcon } from "lucide-react"

export default async function Page() {
  const user = await requireServerUser()
  if (!can(user.role as Role, "modulo", "read")) redirect("/403")

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Título do Módulo"
        description="Descrição breve"
        icon={<SomeIcon />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Módulo" },
        ]}
        actions={
          can(user.role as Role, "modulo", "create") ? (
            <Button>Novo Item</Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* <StatCard title="Total" value={0} /> */}
      </div>

      {/* Content */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        {/* <AsyncContent user={user} /> */}
      </Suspense>
    </div>
  )
}
```
