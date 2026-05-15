// src/app/(dashboard)/rh/ponto/page.tsx
// Página de Ponto Eletrônico
// Worker: clock-in / clock-out com GPS
// ADMIN/GERENTE: dashboard de todos os turnos ativos

import { Suspense } from "react"
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { can, type Role } from "@/shared/lib/rbac-core"
import { redirect } from "next/navigation"
import PontoDashboard from "@/components/rh/ponto/PontoDashboard"
import PontoWorkerView from "@/components/rh/ponto/PontoWorkerView"
import PontoSkeleton from "@/components/rh/ponto/PontoSkeleton"

export const metadata = { title: "Ponto Eletrônico — GladPros" }

export default async function PontoPage() {
  const user = await requireServerUser()

  if (!can(user.role as Role, "rh", "read") && !can(user.role as Role, "workforce", "read")) {
    redirect("/403")
  }

  const isManager = user.role === "ADMIN" || user.role === "GERENTE"

  return (
    <Suspense fallback={<PontoSkeleton isManager={isManager} />}>
      {isManager ? (
        <PontoDashboard user={user} />
      ) : (
        <PontoWorkerView user={user} />
      )}
    </Suspense>
  )
}
