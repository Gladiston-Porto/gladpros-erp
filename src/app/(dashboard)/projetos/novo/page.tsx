import { redirect } from 'next/navigation';
import { can, type Role } from '@/shared/lib/rbac-core';
import { requireServerUser } from '@/shared/lib/requireServerUser';
import NovoProjetoClient from './NovoProjetoClient';

export default async function NovoProjetoPage() {
  const user = await requireServerUser();
  const role = user.role as Role;

  if (!can(role, 'projetos', 'create')) redirect('/403');

  return <NovoProjetoClient />;
}
