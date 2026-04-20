import { redirect } from 'next/navigation'
import { requireServerUser } from '@/shared/lib/requireServerUser'
import { can, type Role } from '@/shared/lib/rbac-core'
import DespesaFormPageClient from './DespesaFormPageClient';

export const dynamic = 'force-dynamic';

export default async function DespesaFormPage() {
  const user = await requireServerUser()
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403")
  return <DespesaFormPageClient />;
}
