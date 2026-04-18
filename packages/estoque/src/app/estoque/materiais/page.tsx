/**
 * PÃ¡gina de Listagem de Materiais
 * /estoque/materiais
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { MaterialList } from '@gladpros/estoque/components/materiais/MaterialList';
import { MaterialFilters } from '@gladpros/estoque/components/materiais/MaterialFilters';
import { SearchBar } from '@gladpros/estoque/components/shared/SearchBar';
import { LoadingSkeleton } from '@gladpros/ui/loading'
import { prisma } from '@/lib/prisma';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MateriaisPage({ searchParams }: PageProps) {
  // Buscar categorias para os filtros
  const categorias = await prisma.categoria.findMany({
    where: { tipo: 'MATERIAL' },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Materiais</h1>
          <p className="text-muted-foreground">
            Gerencie o estoque de materiais
          </p>
        </div>
        <Link href="/estoque/materiais/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Material
          </Button>
        </Link>
      </div>

      {/* Filtros e Busca */}
      <Suspense fallback={<LoadingSkeleton rows={2} />}>
        <div className="flex flex-col gap-4 sm:flex-row">
          <SearchBar
            placeholder="Buscar por cÃ³digo, nome, fabricante..."
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

