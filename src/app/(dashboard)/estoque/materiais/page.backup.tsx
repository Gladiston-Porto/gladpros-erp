/**
 * Página de Listagem de Materiais
 * /estoque/materiais
 * Design System v2.0 - Semana 2
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { PageHeader } from '@gladpros/ui/page-header';
import { MaterialList } from '@/components/estoque/materiais/MaterialList';
import { MaterialFilters } from '@/components/estoque/materiais/MaterialFilters';
import { SearchBar } from '@/components/estoque/shared/SearchBar';
import { LoadingSkeleton } from '@gladpros/ui/loading'
import { prisma } from '@/lib/prisma';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MateriaisPage({ searchParams }: PageProps) {
  // Await searchParams to allow usage if needed locally, or pass strictly as Promise
  // MaterialList expects a Promise, so passing it directly is fine.
  // However, typical pattern is to await it if we use it here.
  // But here we are passing it to MaterialList.
  // Let's check if we use searchParams locally?
  // No, we pass it to MaterialList.
  // Wait, MaterialList definition earlier: `interface MaterialListProps { searchParams: Promise<...> }`
  // So we can pass `searchParams` (which is Promise) directly.

  // Buscar categorias para os filtros
  const categorias = await prisma.categoria.findMany({
    where: { tipo: 'MATERIAL' },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });

  // ... rest of code

  // Update usage below:
  // <MaterialList searchParams={searchParams} />

  return (
    <div className="space-y-8">
      {/* Header com Design System v2.0 */}
      <PageHeader
        title="Materiais"
        description="Gerencie o estoque de materiais e consumíveis"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Materiais' },
        ]}
        actions={
          <Link href="/estoque/materiais/novo">
            <Button size="default" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Material
            </Button>
          </Link>
        }
      />

      {/* ... Hero Section omitted for brevity, keeping existing via partial replace ... */}

      {/* Filtros e Busca */}
      <Suspense fallback={<LoadingSkeleton rows={2} />}>
        <div className="flex flex-col gap-4 sm:flex-row">
          <SearchBar
            placeholder="Buscar por código, nome, fabricante..."
            className="flex-1"
          />
          <MaterialFilters categorias={categorias} />
        </div>
      </Suspense>

      {/* Listagem */}
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <MaterialList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
