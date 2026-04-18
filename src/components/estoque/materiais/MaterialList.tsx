import { prisma } from '@/lib/prisma';
import EmptyState from '../shared/EmptyState';
import { Package } from 'lucide-react';
import { Prisma } from '@prisma/client';
import { MaterialDataTable, type MaterialTableRow } from './MaterialDataTable';

const MAX_MATERIALS = 600;

interface MaterialListProps {
  searchParams: Promise<{
    search?: string;
    categoriaId?: string;
    ativo?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export async function MaterialList({ searchParams }: MaterialListProps) {
  const params = await searchParams;
  const search = params.search;
  const status = params.status;
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
      // Filtro de status RESERVADO via banco
      ...(status === 'reservado' && {
        saldos: {
          some: {
            reservado: { gt: 0 }
          }
        }
      }),
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
    const materiais = await prisma.material.findMany({
      where,
      include: {
        categoria: { select: { id: true, nome: true } },
        unidade: { select: { id: true, nome: true, codigo: true } },
        saldos: {
          select: {
            quantidade: true,
            reservado: true,
          },
        },
      },
      take: MAX_MATERIALS,
      orderBy: { codigo: 'asc' },
    });

    let materialsForTable: MaterialTableRow[] = materiais.map((material) => {
      const saldoTotal = material.saldos.reduce(
        (acc: number, s) => acc + Number(s.quantidade),
        0
      );

      // Calcular reservado total se necessário para o filtro, 
      // embora MaterialTableRow padrão atual não tenha esse campo, 
      // podemos usá-lo para filtrar
      const reservadoTotal = material.saldos.reduce(
        (acc: number, s) => acc + Number(s.reservado || 0),
        0
      );

      const abaixoMinimo = saldoTotal < Number(material.estoqueMinimo);

      return {
        id: material.id,
        codigo: material.codigo,
        nome: material.nome,
        categoria: material.categoria?.nome || null,
        unidadeCodigo: material.unidade?.codigo || null,
        unidadeNome: material.unidade?.nome || null,
        fabricante: material.fabricante || null,
        modelo: material.modelo || null,
        saldoTotal,
        estoqueMinimo: Number(material.estoqueMinimo),
        pontoReposicao: Number(material.pontoReposicao),
        ativo: material.ativo,
        // Adicionamos propriedades temporárias para filtro
        _abaixoMinimo: abaixoMinimo,
        _reservadoTotal: reservadoTotal,
      };
    });

    // Aplicar filtros de status em memória
    // Nota: 'reservado' já é filtrado no banco via Prisma query.
    if (status === 'abaixo_minimo') {
      materialsForTable = materialsForTable.filter(m => (m as any)._abaixoMinimo);
    }

    if (materialsForTable.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="Nenhum material encontrado"
          description={
            search || status
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

    return <MaterialDataTable materials={materialsForTable} />;
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
