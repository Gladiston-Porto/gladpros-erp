import { redirect } from 'next/navigation';
import { can, type Role } from '@/shared/lib/rbac-core';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { requireProjectAccess } from '@/shared/lib/rbac-projects';
import EditarProjetoClient from './EditarProjetoClient';

export default async function EditarProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireServerUser();
  const role = user.role as Role;

  if (!can(role, 'projetos', 'update')) redirect('/403');

  const { id } = await params;
  const projetoId = Number(id);
  if (!Number.isFinite(projetoId)) redirect('/projetos');

  try {
    await requireProjectAccess(user, projetoId, 'canUpdate');
  } catch {
    redirect('/403');
  }

  return <EditarProjetoClient />;
}
