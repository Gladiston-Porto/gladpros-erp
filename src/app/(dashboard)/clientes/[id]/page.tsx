import { redirect } from "next/navigation";
import { can, type Role } from "@/shared/lib/rbac-core";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import EditClienteClientPage from "./EditClienteClientPage";

interface EditClientePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientePage({ params }: EditClientePageProps) {
  const user = await requireServerUser();

  if (!can(user.role as Role, "clientes", "update")) {
    redirect("/403");
  }

  const { id } = await params;
  return <EditClienteClientPage id={id} />;
}
