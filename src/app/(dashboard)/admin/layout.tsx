import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { requireServerUser } from "@/shared/lib/requireServerUser"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireServerUser()

  if (user.role !== "ADMIN") {
    redirect("/403")
  }

  return children
}
