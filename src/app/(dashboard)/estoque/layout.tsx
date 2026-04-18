/**
 * Layout do Módulo Estoque
 * Estrutura base com navegação
 */

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";

export const metadata = {
  title: 'Estoque | GladPros',
  description: 'Gestão de estoque, materiais e equipamentos',
};

export default async function EstoqueLayout({ children }: { children: ReactNode }) {
  const user = await requireServerUser();
  const role = user.role as Role;

  if (!can(role, "estoque", "read")) {
    redirect("/403");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-h-screen">{children}</div>
    </div>
  );
}
