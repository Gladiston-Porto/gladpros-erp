/**
 * AlertaList Component
 * Server Component para listar alertas com DataTable
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AlertaDataTable, type AlertaTableRow } from './AlertaDataTable';
import EmptyState from '../shared/EmptyState';
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

const MAX_ALERTAS = 500;

export async function AlertaList({ searchParams }: AlertaListProps) {
  const params = await searchParams;

  const where: Prisma.AlertaEstoqueWhereInput = {};

  if (params.tipo) {
    where.tipo = params.tipo as any;
  }

  if (params.prioridade) {
    where.prioridade = params.prioridade as any;
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

  const alertas = await prisma.alertaEstoque.findMany({
    where,
    include: {
      material: { select: { id: true, nome: true } },
      equipamento: { select: { id: true, nome: true } },
      projeto: { select: { id: true, numeroProjeto: true } },
    },
    orderBy: [{ ativo: 'desc' }, { prioridade: 'desc' }, { dataAlerta: 'desc' }],
    take: MAX_ALERTAS,
  });

  const alertasForTable: AlertaTableRow[] = alertas.map((alerta) => ({
    id: alerta.id,
    tipo: alerta.tipo,
    prioridade: alerta.prioridade,
    titulo: alerta.titulo,
    mensagem: alerta.mensagem,
    dataAlerta: alerta.dataAlerta,
    dataResolvido: alerta.dataResolvido,
    materialNome: alerta.material?.nome ?? null,
    equipamentoNome: alerta.equipamento?.nome ?? null,
    projetoNumero: alerta.projeto?.numeroProjeto ?? null,
    ativo: alerta.ativo,
  }));

  if (alertasForTable.length === 0) {
    const hasFilters = Object.keys(params).length > 0;
    return (
      <EmptyState
        icon={AlertTriangle}
        title={hasFilters ? 'Nenhum alerta encontrado' : 'Nenhum alerta ativo'}
        description={
          hasFilters ? 'Tente ajustar os filtros.' : 'Não há alertas de estoque no momento.'
        }
      />
    );
  }

  return <AlertaDataTable alertas={alertasForTable} />;
}
