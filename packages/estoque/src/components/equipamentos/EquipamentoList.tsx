/**
 * EquipamentoList Component
 * Server Component para listagem de equipamentos com filtros
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { EquipamentoCard } from './EquipamentoCard';
import { EmptyState } from '../shared/EmptyState';
import { Pagination } from '../shared/Pagination';
import { Package } from 'lucide-react';

type EquipamentoListProps = {
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

export async function EquipamentoList({ searchParams }: EquipamentoListProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 20;
  const skip = (page - 1) * pageSize;

  // Construir where clause
  const where: Prisma.EquipamentoWhereInput = {
    ativo: true,
  };

  // Filtro de busca (código, nome, marca, modelo, numeroSerie)
  if (params.search) {
    where.OR = [
      { codigo: { contains: params.search } },
      { nome: { contains: params.search } },
      { marca: { contains: params.search } },
      { modelo: { contains: params.search } },
      { numeroSerie: { contains: params.search } },
    ];
  }

  // Filtro por tipo
  if (params.tipo) {
    where.tipo = params.tipo as any;
  }

  // Filtro por status
  if (params.status) {
    where.status = params.status as any;
  }

  // Filtro por categoria
  if (params.categoriaId) {
    where.categoriaId = Number(params.categoriaId);
  }

  // Filtro por requer calibração
  if (params.requerCalibracao === 'true') {
    where.requerCalibracao = true;
  } else if (params.requerCalibracao === 'false') {
    where.requerCalibracao = false;
  }

  // Buscar equipamentos
  const [equipamentos, totalCount] = await Promise.all([
    prisma.equipamento.findMany({
      where,
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        codigo: 'asc',
      },
      skip,
      take: pageSize,
    }),
    prisma.equipamento.count({ where }),
  ]);

  // Calcular dias para calibração e manutenção
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const equipamentosComCalculos = equipamentos.map((equip) => {
    let diasParaCalibracao: number | null = null;
    let diasParaManutencao: number | null = null;

    if (equip.proximaCalibracao) {
      const proximaCal = new Date(equip.proximaCalibracao);
      proximaCal.setHours(0, 0, 0, 0);
      diasParaCalibracao = Math.ceil(
        (proximaCal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    if (equip.proximaManutencao) {
      const proximaMan = new Date(equip.proximaManutencao);
      proximaMan.setHours(0, 0, 0, 0);
      diasParaManutencao = Math.ceil(
        (proximaMan.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      ...equip,
      diasParaCalibracao,
      diasParaManutencao,
    };
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  if (equipamentos.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Nenhum equipamento encontrado"
        description={
          params.search || params.tipo || params.status
            ? 'Tente ajustar os filtros para encontrar o que procura.'
            : 'Comece cadastrando seu primeiro equipamento.'
        }
        action={{
          label: 'Novo Equipamento',
          href: '/estoque/equipamentos/novo',
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {equipamentosComCalculos.map((equipamento) => (
          <EquipamentoCard key={equipamento.id} equipamento={equipamento} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          pagination={{
            page,
            pageSize,
            total: totalCount,
            totalPages,
          }}
        />
      )}
    </div>
  );
}
