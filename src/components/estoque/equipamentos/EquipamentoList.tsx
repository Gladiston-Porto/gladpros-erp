/**
 * EquipamentoList Component
 * Server Component para listagem de equipamentos com DataTable
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { EquipamentoDataTable, type EquipamentoTableRow } from './EquipamentoDataTable';
import EmptyState from '../shared/EmptyState';
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

const MAX_EQUIPAMENTOS = 500;

export async function EquipamentoList({ searchParams }: EquipamentoListProps) {
  const params = await searchParams;

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
  const equipamentos = await prisma.equipamento.findMany({
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
    take: MAX_EQUIPAMENTOS,
  });

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
      id: equip.id,
      codigo: equip.codigo,
      nome: equip.nome,
      tipo: equip.tipo,
      status: equip.status,
      marca: equip.marca,
      modelo: equip.modelo,
      numeroSerie: equip.numeroSerie,
      categoriaNome: equip.categoria?.nome ?? null,
      requerCalibracao: equip.requerCalibracao,
      diasParaCalibracao,
      diasParaManutencao,
    };
  });

  const equipamentosForTable: EquipamentoTableRow[] = equipamentosComCalculos;

  if (equipamentosForTable.length === 0) {
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

  return <EquipamentoDataTable equipamentos={equipamentosForTable} />;
}
