import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireServerUser } from '@/shared/lib/requireServerUser'
import { can, type Role } from '@/shared/lib/rbac-core'
import { ModulePageHeader } from '@gladpros/ui/module-page-header'
import { MapPin } from 'lucide-react'
import LocalizacoesPageClient from './client'

export const metadata = { title: 'Localizações — Estoque | GladPros' }

export default async function LocalizacoesPage() {
  const user = await requireServerUser()
  if (!can(user.role as Role, 'estoque', 'read')) redirect('/403')

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-hero-gradient px-6 py-8">
        <ModulePageHeader
          title="Localizações"
          description="Gerencie os locais de armazenamento de materiais"
          icon={<MapPin className="w-7 h-7 text-white" />}
          breadcrumbs={[
            { label: 'Estoque', href: '/estoque' },
            { label: 'Configurações' },
            { label: 'Localizações' },
          ]}
          className="text-white"
        />
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        }>
          <LocalizacoesPageClient />
        </Suspense>
      </div>
    </div>
  )
}
