import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { PageHeader } from "@gladpros/ui/page-header"
import { CheckCircle2, UploadCloud } from 'lucide-react'
import ConciliacaoList from '@/components/financeiro/conciliacao/ConciliacaoList'

export const metadata = {
  title: 'Conciliação Bancária | GladPros',
  description: 'Concilie saldos bancários com registros do sistema',
};

const ListFallback = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    <p className="mt-3 text-sm text-muted-foreground">Carregando dados de conciliação...</p>
  </div>
)

export default async function ConciliacaoPage() {
  const empresaId = 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliação bancária"
        description="Confronte lançamentos, importe extratos e resolva divergências de saldo."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/dashboard/financeiro' },
          { label: 'Conciliação' },
        ]}
        actions={
          <div className="flex gap-3">
            <Link href="/dashboard/financeiro/conciliacao/importar">
              <Button variant="outline" size="lg">
                <UploadCloud className="h-4 w-4" />
                Importar extrato
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/conciliacao">
              <Button size="lg">
                <CheckCircle2 className="h-4 w-4" />
                Nova conciliação
              </Button>
            </Link>
          </div>
        }
      />

      <Suspense fallback={<ListFallback />}>
        <ConciliacaoList empresaId={empresaId} />
      </Suspense>
    </div>
  )
}
