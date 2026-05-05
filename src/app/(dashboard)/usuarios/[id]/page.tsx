// src/app/(dashboard)/usuarios/[id]/page.tsx
import { requireServerUser } from "@/shared/lib/requireServerUser";
import UserEditClient from "./UserEditClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await requireServerUser();
  return (
    <UserEditClient
      id={id}
      currentUserId={Number(currentUser.id)}
      currentUserRole={currentUser.role as string}
    />
  );
}
