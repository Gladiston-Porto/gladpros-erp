import { redirect } from 'next/navigation'
import { requireServerUser } from '@/shared/lib/requireServerUser'
import { can, type Role } from '@/shared/lib/rbac-core'
import ContaFormPageClient from './ContaFormPageClient'

export const dynamic = 'force-dynamic'

export default async function ContaFormPage() {
  const user = await requireServerUser()
  if (!can(user.role as Role, "financeiro", "create")) redirect("/403")
  return <ContaFormPageClient />
}
