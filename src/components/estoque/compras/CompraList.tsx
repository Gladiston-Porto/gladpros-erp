/**
 * CompraList Component
 * Server Component para listar compras com DataTable
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CompraDataTable, type CompraTableRow } from './CompraDataTable';
import EmptyState from '../shared/EmptyState';
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

const MAX_COMPRAS = 500;

export async function CompraList({ searchParams }: CompraListProps) {
  const params = await searchParams;

  const where: Prisma.CompraWhereInput = {};

  if (params.status) {
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.status = params.status as any;
  }

   
  if (params.tipo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.tipo = params.tipo as any;
  }

  if (params.fornecedorId) {
    where.fornecedorId = Number(params.fornecedorId);
  }

  if (params.projetoId) {
    where.projetoId = Number(params.projetoId);
  }

  const compras = await prisma.compra.findMany({
    where,
    include: {
      fornecedor: { select: { id: true, nome: true } },
      projeto: { select: { id: true, numeroProjeto: true } },
      _count: { select: { itens: true } },
    },
    orderBy: { dataCompra: 'desc' },
    take: MAX_COMPRAS,
  });

  const comprasForTable: CompraTableRow[] = compras.map((compra) => ({
    id: compra.id,
    numeroCompra: compra.numeroNf ?? `#${compra.id}`,
    tipo: compra.tipo,
    status: compra.status,
    dataCompra: compra.dataCompra,
    valorTotal: Number(compra.valorTotal),
    fornecedorNome: compra.fornecedor?.nome ?? null,
    projetoNumero: compra.projeto?.numeroProjeto ?? null,
    totalItens: compra._count.itens,
  }));

  if (comprasForTable.length === 0) {
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

  return <CompraDataTable compras={comprasForTable} />;
}
