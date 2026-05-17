import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import ContaDetailPage from "./_components/ContaDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContaPage({ params }: Props) {
  const user = await requireServerUser();
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403");

  const { id } = await params;

  return <ContaDetailPage id={id} />;
}
