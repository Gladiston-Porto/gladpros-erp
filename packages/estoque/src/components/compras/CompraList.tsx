/**
 * CompraList Component
 * Server Component para listar compras
 */

import { prisma } from '@/lib/prisma';
import { CompraCard } from './CompraCard';
import { EmptyState } from '../shared/EmptyState';
import { Pagination } from '../shared/Pagination';
import { ShoppingCart } from 'lucide-react';

type CompraListProps = {
  searchParams: Promise<{
    status?: string;
    tipo?: string;
    fornecedorId?: string;
    projetoId?: string;
    page?: string;
  }>;
};

const ITEMS_PER_PAGE = 12;

export async function CompraList({ searchParams }: CompraListProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.tipo) {
    where.tipo = params.tipo;
  }

  if (params.fornecedorId) {
    where.fornecedorId = Number(params.fornecedorId);
  }

  if (params.projetoId) {
    where.projetoId = Number(params.projetoId);
  }

  const [compras, total] = await Promise.all([
    prisma.compra.findMany({
      where,
      include: {
        fornecedor: { select: { id: true, nome: true } },
        projeto: { select: { id: true, numeroProjeto: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { dataCompra: 'desc' },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.compra.count({ where }),
  ]);

  if (compras.length === 0) {
    const hasFilters = params.status || params.tipo || params.fornecedorId || params.projetoId;
    return (
      <EmptyState
        icon={ShoppingCart}
        title={hasFilters ? 'Nenhuma compra encontrada' : 'Nenhuma compra registrada'}
        description={
          hasFilters
            ? 'Tente ajustar os filtros.'
            : 'Registre a primeira compra de materiais ou equipamentos.'
        }
        action={
          hasFilters
            ? undefined
            : {
                label: 'Nova Compra',
                href: '/estoque/compras/nova',
              }
        }
      />
    );
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {compras.map((compra) => (
          <CompraCard key={compra.id} compra={compra} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          pagination={{
            page,
            pageSize: ITEMS_PER_PAGE,
            total,
            totalPages,
          }}
        />
      )}
    </div>
  );
}
