import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@gladpros/ui/button'
import { PageHeader } from "@gladpros/ui/page-header"
import { Plus } from 'lucide-react'
import ReceitaList from '@/components/financeiro/receitas/ReceitaList'

export const metadata = {
  title: 'Receitas | GladPros',
  description: 'Gestão de receitas e recebimentos',
};

const ListFallback = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
    <p className="mt-3 text-sm text-muted-foreground">Carregando receitas...</p>
  </div>
)

export default async function ReceitasPage() {
  const empresaId = 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receitas"
        description="Controle contratos, recebimentos e previsões de faturamento."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/dashboard/financeiro' },
          { label: 'Receitas' },
        ]}
        actions={
          <Link href="/dashboard/financeiro/receitas/novo">
            <Button size="lg" variant="secondary">
              <Plus className="h-4 w-4" />
              Nova receita
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<ListFallback />}>
        <ReceitaList empresaId={empresaId} />
      </Suspense>
    </div>
  )
}
