/**
 * MovimentacaoList Component
 * Server Component para listar movimentações com DataTable
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MovimentacaoDataTable, type MovimentacaoTableRow } from './MovimentacaoDataTable';
import EmptyState from '../shared/EmptyState';
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

const MAX_MOVIMENTACOES = 500;

export async function MovimentacaoList({ searchParams }: MovimentacaoListProps) {
  const params = await searchParams;

  const where: Prisma.MovimentacaoWhereInput = {};

  // Filtro de tipo
  if (params.tipo) {
    where.tipo = params.tipo as any;
  }

  // Filtro de material
  if (params.materialId) {
    where.materialId = Number(params.materialId);
  }

  // Filtro de equipamento
  if (params.equipamentoId) {
    where.equipamentoId = Number(params.equipamentoId);
  }

  // Filtro de projeto
  if (params.projetoId) {
    where.projetoId = Number(params.projetoId);
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

  const movimentacoes = await prisma.movimentacao.findMany({
    where,
    include: {
      material: { select: { id: true, nome: true } },
      equipamento: { select: { id: true, nome: true } },
      projeto: { select: { id: true, numeroProjeto: true } },
      usuario: { select: { id: true, nomeCompleto: true } },
    },
    orderBy: { dataMovimentacao: 'desc' },
    take: MAX_MOVIMENTACOES,
  });

  const movimentacoesForTable: MovimentacaoTableRow[] = movimentacoes.map((mov) => ({
    id: Number(mov.id),
    tipo: mov.tipo,
    dataMovimentacao: mov.dataMovimentacao,
    quantidade: Number(mov.quantidade),
    materialNome: mov.material?.nome ?? null,
    equipamentoNome: mov.equipamento?.nome ?? null,
    projetoNumero: mov.projeto?.numeroProjeto ?? null,
    usuarioNome: mov.usuario?.nomeCompleto ?? null,
  }));

  if (movimentacoesForTable.length === 0) {
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

  return <MovimentacaoDataTable movimentacoes={movimentacoesForTable} />;
}
