import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { PageHeader } from "@gladpros/ui/page-header"
import { RefreshCw } from 'lucide-react'
import TransferenciaList from '@/components/financeiro/transferencias/TransferenciaList'

export const metadata = {
  title: 'Transferências | GladPros',
  description: 'Gerencie transferências entre contas bancárias',
};

const ListFallback = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    <p className="mt-3 text-sm text-gray-500">Carregando transferências...</p>
  </div>
)

export default async function TransferenciasPage() {
  const empresaId = 1

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
        actions={
          <Link href="/dashboard/financeiro/transferencias/novo">
            <Button size="lg">
              <RefreshCw className="h-4 w-4" />
              Nova transferência
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<ListFallback />}>
        <TransferenciaList empresaId={empresaId} />
      </Suspense>
    </div>
  )
}
