// src/app/(dashboard)/usuarios/[id]/page.tsx
import UserEditClient from "./UserEditClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserEditClient id={id} />;
}
