// @ts-nocheck
/**
 * GladPros — Page Template v3.1
 *
 * Copiar e adaptar para novas páginas.
 * Substituir: MODULE_KEY, título, path, AsyncContent
 *
 * Padrões:
 * - RBAC server-side
 * - ModulePageHeader (padrão atual — não usar bg-hero-gradient em módulos internos)
 * - Sub-path imports do @gladpros/ui
 * - Stats cards com StatCard
 * - Suspense com skeleton fallback
 */

import { Suspense } from "react"
import { redirect } from "next/navigation"
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { can, type Role } from "@/shared/lib/rbac-core"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { Button } from "@gladpros/ui/button"
import { StatCard } from "@gladpros/ui/stat-card"
import { Card, CardContent, CardHeader } from "@gladpros/ui/card"
import { Skeleton } from "@gladpros/ui/skeleton"
import { SomeIcon } from "lucide-react"

// -- Chave RBAC do módulo (alterar para o módulo correto) --
const MODULE_KEY = "clientes" as const

export default async function Page() {
  const user = await requireServerUser()

  // RBAC: redirecionar se sem acesso de leitura
  if (!can(user.role as Role, MODULE_KEY, "read")) {
    redirect("/403")
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <ModulePageHeader
        title="Título do Módulo"
        description="Descrição breve do módulo"
        icon={<SomeIcon />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Módulo" },
        ]}
        actions={
          can(user.role as Role, MODULE_KEY, "create") ? (
            <Button>Novo Item</Button>
          ) : undefined
        }
      />

      {/* ---- STATS CARDS ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total" value={0} />
        {/* Repetir para outros KPIs */}
      </div>

      {/* ---- CONTEÚDO ---- */}
      <Suspense fallback={<ContentSkeleton />}>
        {/* Substituir pelo componente async do módulo */}
        {/* <ModuleContent user={user} /> */}
      </Suspense>
    </div>
  )
}

// -- Loading Skeleton --
function ContentSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
