/**
 * MovimentacaoList Component
 * Server Component para listar movimentações
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { MovimentacaoCard } from './MovimentacaoCard';
import { EmptyState } from '../shared/EmptyState';
import { Pagination } from '../shared/Pagination';
import { FileX } from 'lucide-react';

type MovimentacaoListProps = {
  searchParams: Promise<{
    search?: string;
    tipo?: string;
    materialId?: string;
    equipamentoId?: string;
    projetoId?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: string;
  }>;
};

const ITEMS_PER_PAGE = 12;

export async function MovimentacaoList({ searchParams }: MovimentacaoListProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: any = {};

  // Filtro de tipo
  if (params.tipo) {
    where.tipo = params.tipo;
  }

  // Filtro de material
  if (params.materialId) {
    where.materialId = params.materialId;
  }

  // Filtro de equipamento
  if (params.equipamentoId) {
    where.equipamentoId = params.equipamentoId;
  }

  // Filtro de projeto
  if (params.projetoId) {
    where.projetoId = params.projetoId;
  }

  // Filtro de data
  if (params.dataInicio || params.dataFim) {
    where.dataMovimentacao = {};
    if (params.dataInicio) {
      where.dataMovimentacao.gte = new Date(params.dataInicio);
    }
    if (params.dataFim) {
      where.dataMovimentacao.lte = new Date(params.dataFim);
    }
  }

  const [movimentacoes, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      include: {
        material: { select: { id: true, nome: true } },
        equipamento: { select: { id: true, nome: true } },
        projeto: { select: { id: true, numeroProjeto: true } },
        usuario: { select: { id: true, nomeCompleto: true } },
      },
      orderBy: { dataMovimentacao: 'desc' },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.movimentacao.count({ where }),
  ]);

  if (movimentacoes.length === 0) {
    const hasFilters = params.tipo || params.materialId || params.equipamentoId || params.projetoId || params.dataInicio || params.dataFim;
    return (
      <EmptyState
        icon={FileX}
        title={hasFilters ? 'Nenhuma movimentação encontrada' : 'Nenhuma movimentação'}
        description={
          hasFilters
            ? 'Tente ajustar os filtros para encontrar movimentações.'
            : 'Registre a primeira movimentação de estoque.'
        }
        action={
          hasFilters
            ? undefined
            : {
                label: 'Nova Movimentação',
                href: '/estoque/movimentacoes/nova',
              }
        }
      />
    );
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {movimentacoes.map((mov: any) => (
          <MovimentacaoCard key={mov.id} movimentacao={mov} />
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
