/**
 * AlertaList Component
 * Server Component para listar alertas
 */

import { prisma } from '@/lib/prisma';
import { AlertaCard } from './AlertaCard';
import { EmptyState } from '../shared/EmptyState';
import { Pagination } from '../shared/Pagination';
import { AlertTriangle } from 'lucide-react';

type AlertaListProps = {
  searchParams: Promise<{
    tipo?: string;
    prioridade?: string;
    status?: string;
    materialId?: string;
    equipamentoId?: string;
    page?: string;
  }>;
};

const ITEMS_PER_PAGE = 12;

export async function AlertaList({ searchParams }: AlertaListProps) {
  // ✅ Await searchParams (Next.js 15+)
  const params = await searchParams;
  
  const page = Number(params.page) || 1;
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where: any = {};

  if (params.tipo) {
    where.tipo = params.tipo;
  }

  if (params.prioridade) {
    where.prioridade = params.prioridade;
  }

  if (params.status === 'pendente') {
    where.dataResolvido = null;
    where.ativo = true;
  } else if (params.status === 'resolvido') {
    where.dataResolvido = { not: null };
  }

  if (params.materialId) {
    where.materialId = Number(params.materialId);
  }

  if (params.equipamentoId) {
    where.equipamentoId = Number(params.equipamentoId);
  }

  const [alertas, total] = await Promise.all([
    prisma.alertaEstoque.findMany({
      where,
      include: {
        material: { select: { id: true, nome: true } },
        equipamento: { select: { id: true, nome: true } },
        projeto: { select: { id: true, numeroProjeto: true } },
      },
      orderBy: [
        { ativo: 'desc' },
        { prioridade: 'desc' },
        { dataAlerta: 'desc' },
      ],
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.alertaEstoque.count({ where }),
  ]);

  if (alertas.length === 0) {
    const hasFilters = Object.keys(params).length > 0;
    return (
      <EmptyState
        icon={AlertTriangle}
        title={hasFilters ? 'Nenhum alerta encontrado' : 'Nenhum alerta ativo'}
        description={
          hasFilters
            ? 'Tente ajustar os filtros.'
            : 'Não há alertas de estoque no momento.'
        }
      />
    );
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {alertas.map((alerta: any) => (
          <AlertaCard key={alerta.id.toString()} alerta={alerta} />
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
