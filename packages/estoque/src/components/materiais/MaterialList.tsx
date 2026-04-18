import { prisma } from '@/lib/prisma';
import { MaterialCard } from './MaterialCard';
import { EmptyState } from '../shared/EmptyState';
import { Pagination } from '../shared/Pagination';
import { Package } from 'lucide-react';
import { Prisma } from '@prisma/client';

interface MaterialListProps {
  searchParams: Promise<{
    search?: string;
    categoriaId?: string;
    ativo?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export async function MaterialList({ searchParams }: MaterialListProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const pageSize = parseInt(params.pageSize || '20');
  const search = params.search;
  const categoriaId = params.categoriaId
    ? parseInt(params.categoriaId)
    : undefined;
  const ativo =
    params.ativo === 'true'
      ? true
      : params.ativo === 'false'
      ? false
      : undefined;

  try {
    // Construir filtros
    const where: Prisma.MaterialWhereInput = {
      ...(ativo !== undefined && { ativo }),
      ...(categoriaId && { categoriaId }),
      ...(search && {
        OR: [
          { codigo: { contains: search } },
          { nome: { contains: search } },
          { fabricante: { contains: search } },
          { modelo: { contains: search } },
        ],
      }),
    };

    // Buscar materiais
    const [materiais, total] = await Promise.all([
      prisma.material.findMany({
        where,
        include: {
          categoria: { select: { id: true, nome: true } },
          unidade: { select: { id: true, nome: true, codigo: true } },
          saldos: {
            select: {
              quantidade: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { codigo: 'asc' },
      }),
      prisma.material.count({ where }),
    ]);

    // Calcular saldo total para cada material
    const materiaisComSaldo = materiais.map((material) => ({
      ...material,
      saldoTotal: material.saldos.reduce(
        (acc: number, s) => acc + Number(s.quantidade),
        0
      ),
    }));

    if (!materiaisComSaldo || materiaisComSaldo.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="Nenhum material encontrado"
          description={
            search
              ? 'Tente ajustar sua busca ou filtros'
              : 'Comece cadastrando seu primeiro material'
          }
          action={{
            label: 'Novo Material',
            href: '/estoque/materiais/novo',
          }}
        />
      );
    }

    const totalPages = Math.ceil(total / pageSize);

    return (
      <div className="space-y-6">
        {/* Grid de Materiais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {materiaisComSaldo.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>

        {/* Paginação */}
        {total > pageSize && (
          <Pagination
            pagination={{
              page,
              pageSize,
              total,
              totalPages,
            }}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error('Erro ao carregar materiais:', error);

    return (
      <EmptyState
        icon={Package}
        title="Erro ao carregar materiais"
        description="Ocorreu um erro ao buscar os materiais. Tente novamente."
      />
    );
  }
}
