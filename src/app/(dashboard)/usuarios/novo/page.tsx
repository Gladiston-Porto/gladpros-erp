import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import UserCreateClient from "./UserCreateClient";

async function UserCreatePageContent() {
  const user = await requireServerUser();
  if (!can(user.role as Role, 'usuarios', 'create')) redirect('/403');
  return <UserCreateClient />;
}

function UserCreatePageSkeleton() {
  return <div className="h-80 animate-pulse rounded-2xl bg-muted" />;
}

export default function Page() {
  return (
    <Suspense fallback={<UserCreatePageSkeleton />}>
      <UserCreatePageContent />
    </Suspense>
  );
}
