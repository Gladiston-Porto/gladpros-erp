import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { PageHeader } from "@gladpros/ui/page-header"
import { Download, FileBarChart2 } from 'lucide-react'
import FluxoCaixaList from '@/components/financeiro/fluxo-caixa/FluxoCaixaList'

export const metadata = {
  title: 'Fluxo de Caixa | GladPros',
  description: 'Acompanhe entradas, saídas e saldo em tempo real',
};

const ListFallback = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    <p className="mt-3 text-sm text-gray-500">Carregando movimentações...</p>
  </div>
)

export default async function FluxoCaixaPage() {
  const empresaId = 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de caixa"
        description="Analise entradas, saídas e projeções de saldo em tempo real."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/dashboard/financeiro' },
          { label: 'Fluxo de caixa' },
        ]}
        actions={
          <div className="flex gap-3">
            <Link href="/dashboard/financeiro/relatorios/balanco">
              <Button variant="outline" size="lg">
                <FileBarChart2 className="h-4 w-4" />
                Relatórios
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/fluxo-caixa/exportar">
              <Button size="lg">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </Link>
          </div>
        }
      />

      <Suspense fallback={<ListFallback />}>
        <FluxoCaixaList empresaId={empresaId} />
      </Suspense>
    </div>
  )
}
