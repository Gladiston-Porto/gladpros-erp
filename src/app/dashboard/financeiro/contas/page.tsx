import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { PageHeader } from "@gladpros/ui/page-header"
import { Landmark, RefreshCw } from 'lucide-react'
import ContaBancariaList from '@/components/financeiro/contas/ContaBancariaList'

export const metadata = {
  title: 'Contas Bancárias | GladPros',
  description: 'Gestão de contas bancárias e saldos',
};

const ListFallback = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    <p className="mt-3 text-sm text-gray-500">Carregando contas bancárias...</p>
  </div>
)

export default async function ContasBancariasPage() {
  const empresaId = 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas bancárias"
        description="Visualize saldos consolidados, contas principais e status de conciliações."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/dashboard/financeiro' },
          { label: 'Contas bancárias' },
        ]}
        actions={
          <div className="flex gap-3">
            <Link href="/dashboard/financeiro/transferencias/novo">
              <Button variant="outline" size="lg">
                <RefreshCw className="h-4 w-4" />
                Nova transferência
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/fluxo-caixa">
              <Button size="lg">
                <Landmark className="h-4 w-4" />
                Fluxo de caixa
              </Button>
            </Link>
          </div>
        }
      />

      <Suspense fallback={<ListFallback />}>
        <ContaBancariaList empresaId={empresaId} />
      </Suspense>
    </div>
  )
}
