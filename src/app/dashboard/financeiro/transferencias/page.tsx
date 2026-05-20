import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireServerUser } from '@/shared/lib/requireServerUser'
import { can, type Role } from '@/shared/lib/rbac-core'
import { PageHeader } from "@gladpros/ui/page-header"
import TransferenciaList from '@/components/financeiro/transferencias/TransferenciaList'
import NovaTransferenciaDialog from './NovaTransferenciaDialog'

export const metadata = {
  title: 'Transferências | GladPros',
  description: 'Gerencie transferências entre contas bancárias',
};

const ListFallback = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    <p className="mt-3 text-sm text-muted-foreground">Carregando transferências...</p>
  </div>
)

export default async function TransferenciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const user = await requireServerUser()
  if (!can(user.role as Role, "financeiro", "read")) redirect("/403")
  const sp = await searchParams
  const page = Number(sp.page ?? 1)
  const empresaId = user.empresaId

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferências"
        description="Controle envios entre contas, conciliações e status das operações."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/dashboard/financeiro' },
          { label: 'Transferências' },
        ]}
        actions={<NovaTransferenciaDialog />}
      />

      <Suspense fallback={<ListFallback />}>
        <TransferenciaList empresaId={empresaId} page={page} />
      </Suspense>
    </div>
  )
}
