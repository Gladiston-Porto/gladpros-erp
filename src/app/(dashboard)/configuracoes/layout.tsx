import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";

export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const user = await requireServerUser();
  const role = user.role as Role;

  if (!can(role, "configuracoes", "read")) {
    redirect("/403");
  }

  return children;
}
