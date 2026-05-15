import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import UserCreateClient from "./UserCreateClient";

export default async function Page() {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'usuarios', 'create')) redirect('/403');
  return <UserCreateClient />;
}
