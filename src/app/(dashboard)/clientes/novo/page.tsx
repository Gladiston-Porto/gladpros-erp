import { redirect } from "next/navigation";
import NovoClienteClientPage from "./NovoClienteClientPage";
import { can, type Role } from "@/shared/lib/rbac-core";
import { requireServerUser } from "@/shared/lib/requireServerUser";

export default async function NovoClientePage() {
  const user = await requireServerUser();

  if (!can(user.role as Role, "clientes", "create")) {
    redirect("/403");
  }

  return <NovoClienteClientPage />;
}
