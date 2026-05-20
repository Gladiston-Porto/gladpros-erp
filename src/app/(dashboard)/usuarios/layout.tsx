import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { requireServerUser } from "@/shared/lib/requireServerUser"
import { can, type Role } from "@/shared/lib/rbac-core"

export default async function UsuariosLayout({ children }: { children: ReactNode }) {
  const user = await requireServerUser()
  if (!can(user.role as Role, "usuarios", "read")) redirect("/403")

  return children
}
