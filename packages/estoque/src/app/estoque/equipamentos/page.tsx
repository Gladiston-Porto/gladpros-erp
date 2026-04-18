/**
 * Equipamentos - PÃ¡gina de Listagem
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { SearchBar } from '@gladpros/estoque/components/shared/SearchBar';
import { LoadingSpinner } from '@gladpros/estoque/components/shared/LoadingSpinner';
import { EquipamentoList } from '@gladpros/estoque/components/equipamentos/EquipamentoList';
import { EquipamentoFilters } from '@gladpros/estoque/components/equipamentos/EquipamentoFilters';
import { prisma } from '@/lib/prisma';

type PageProps = {
  searchParams: Promise<{
    search?: string;
    tipo?: string;
    status?: string;
    categoriaId?: string;
    requerCalibracao?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function EquipamentosPage({ searchParams }: PageProps) {
  // Buscar categorias do tipo EQUIPAMENTO
  const categorias = await prisma.categoria.findMany({
    where: {
      tipo: 'EQUIPAMENTO',
    },
    orderBy: {
      nome: 'asc',
    },
    select: {
      id: true,
      nome: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie ferramentas, mÃ¡quinas e EPIs
          </p>
        </div>
        <Link href="/estoque/equipamentos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Equipamento
          </Button>
        </Link>
      </div>

      {/* Busca e Filtros */}
      <Suspense fallback={<LoadingSpinner />}>
        <div className="flex flex-col gap-4">
          <SearchBar placeholder="Buscar por cÃ³digo, nome, marca, modelo ou S/N..." />
          <EquipamentoFilters categorias={categorias} />
        </div>
      </Suspense>

      {/* Lista */}
      <Suspense fallback={<LoadingSpinner />}>
        <EquipamentoList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

