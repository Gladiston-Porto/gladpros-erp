/**
 * Compras Page
 * Lista todas as compras com filtros
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { CompraFilters } from '@gladpros/estoque/components/compras/CompraFilters';
import { CompraList } from '@gladpros/estoque/components/compras/CompraList';
import { LoadingSpinner } from '@gladpros/estoque/components/shared/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

type PageProps = {
  searchParams: Promise<{
    status?: string;
    tipo?: string;
    fornecedorId?: string;
    projetoId?: string;
    page?: string;
  }>;
};

export default async function ComprasPage({ searchParams }: PageProps) {
  const [fornecedores, projetos] = await Promise.all([
    prisma.fornecedor.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
      take: 100,
    }),
    prisma.projeto.findMany({
      select: { id: true, numeroProjeto: true },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">GestÃ£o de pedidos e recebimentos</p>
        </div>
        <Link href="/estoque/compras/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Compra
          </Button>
        </Link>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <CompraFilters
          fornecedores={fornecedores.map((f) => ({ id: String(f.id), nome: f.nome }))}
          projetos={projetos.map((p) => ({ id: String(p.id), nome: p.numeroProjeto }))}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <CompraList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

