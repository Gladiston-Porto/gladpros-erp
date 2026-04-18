/**
 * Compras Page
 * Lista todas as compras com filtros
 * Design System v2.0 - Semana 2
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Button } from '@gladpros/ui/button'
import { ModulePageHeader } from '@gladpros/ui/module-page-header';
import { CompraFilters } from '@/components/estoque/compras/CompraFilters';
import { CompraList } from '@/components/estoque/compras/CompraList';
import { LoadingSpinner } from '@/components/estoque/shared/LoadingSpinner';
import { Plus, ShoppingCart } from 'lucide-react';
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
      <ModulePageHeader
        title="Compras"
        description="Gestão de pedidos de compra, cotações e recebimentos"
        icon={<ShoppingCart />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Estoque', href: '/estoque' },
          { label: 'Compras' },
        ]}
        actions={
          <Link href="/estoque/compras/nova">
            <Button size="default">
              <Plus className="mr-2 h-4 w-4" />
              Nova Compra
            </Button>
          </Link>
        }
      />

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
