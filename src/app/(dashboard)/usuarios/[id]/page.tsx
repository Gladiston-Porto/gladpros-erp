// src/app/(dashboard)/usuarios/[id]/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/shared/lib/requireServerUser";
import { can, type Role } from "@/shared/lib/rbac-core";
import UserEditClient from "./UserEditClient";

async function UserEditPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await requireServerUser();
  const targetId = Number(id);

  if (Number(currentUser.id) !== targetId && !can(currentUser.role as Role, "usuarios", "read")) {
    redirect("/403");
  }

  return (
    <UserEditClient
      id={id}
      currentUserId={Number(currentUser.id)}
      currentUserRole={currentUser.role as string}
    />
  );
}

function UserEditPageSkeleton() {
  return <div className="h-80 animate-pulse rounded-2xl bg-muted" />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<UserEditPageSkeleton />}>
      <UserEditPageContent params={params} />
    </Suspense>
  );
}
