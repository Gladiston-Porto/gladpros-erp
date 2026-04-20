import { redirect } from 'next/navigation'
import { requireServerUser } from '@/shared/lib/requireServerUser'
import { can, type Role } from '@/shared/lib/rbac-core'
import ReceitaFormPageClient from './ReceitaFormPageClient'

export const dynamic = 'force-dynamic'

export default async function ReceitaFormPage() {
  const user = await requireServerUser()
  if (!can(user.role as Role, "financeiro", "create")) redirect("/403")
  return <ReceitaFormPageClient />
}
