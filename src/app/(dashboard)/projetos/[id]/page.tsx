import { redirect } from 'next/navigation';
import { can, type Role } from '@/shared/lib/rbac-core';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import { requireProjectAccess } from '@/shared/lib/rbac-projects';
import ProjetoDetailClient from './ProjetoDetailClient';

export default async function ProjetoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireServerUser();
  const role = user.role as Role;

  if (!can(role, 'projetos', 'read')) redirect('/403');

  const { id } = await params;
  const projetoId = Number(id);
  if (!Number.isFinite(projetoId)) redirect('/projetos');

  try {
    await requireProjectAccess(user, projetoId, 'canRead');
  } catch {
    redirect('/403');
  }

  return (
    <ProjetoDetailClient
      permissions={{
        canUpdate: can(role, 'projetos', 'update'),
        canDelete: can(role, 'projetos', 'delete'),
        canReadStock: can(role, 'estoque', 'read'),
        canManageStock: can(role, 'projetos', 'update') && can(role, 'estoque', 'update'),
        canViewFinancials: can(role, 'financeiro', 'read'),
        userRole: user.role,
      }}
    />
  );
}
