import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { ClientesAccessProvider } from "./ClientesAccessContext";
import { can, type Role } from "@/shared/lib/rbac-core";

export default async function ClientesLayout({ children }: { children: ReactNode }) {
  const serverUser = await requireServerUser();
  const role = serverUser.role as Role;

  if (!can(role, "clientes", "read")) {
    redirect("/403");
  }

  return <ClientesAccessProvider role={role}>{children}</ClientesAccessProvider>;
}
