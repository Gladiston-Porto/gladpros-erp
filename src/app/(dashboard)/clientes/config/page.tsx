import { redirect } from "next/navigation";
import ConfigClientesClientPage from "./ConfigClientesClientPage";
import { can, type Role } from "@/shared/lib/rbac-core";
import { requireServerUser } from "@/shared/lib/requireServerUser";

export default async function ConfigClientesPage() {
  const user = await requireServerUser();

  if (!can(user.role as Role, "clientes", "update")) {
    redirect("/403");
  }

  return <ConfigClientesClientPage />;
}
