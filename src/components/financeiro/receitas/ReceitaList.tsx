import { prisma } from '@/lib/prisma';
import ReceitaDataTable from './ReceitaDataTable';
import { ReceitaTableRow } from './ReceitaDataTable';
import EmptyState from '../shared/EmptyState';
import { TrendingUp } from 'lucide-react';

interface ReceitaListProps {
  empresaId: number;
  status?: 'PENDENTE' | 'RECEBIDA' | 'CANCELADA' | 'VENCIDA';
  categoriaId?: number;
  clienteId?: number;
  dataInicio?: Date;
  dataFim?: Date;
}

export default async function ReceitaList({
  empresaId,
  status,
  categoriaId,
  clienteId,
  dataInicio,
  dataFim,
}: ReceitaListProps) {
  const receitas = await prisma.revenue.findMany({
    where: {
      empresaId,
      ...(status && { status }),
      ...(categoriaId && { categoriaId }),
      ...(clienteId && { clienteId }),
      ...(dataInicio && dataFim && {
        dataVencimento: {
          gte: dataInicio,
          lte: dataFim,
        },
      }),
    },
    include: {
      categoria: {
        select: {
          nome: true,
          cor: true,
        },
      },
      cliente: {
        select: {
          nomeCompleto: true,
          razaoSocial: true,
          nomeFantasia: true,
        },
      },
    },
    orderBy: {
      dataVencimento: 'desc',
    },
  });

  // Mapear dados do Prisma para o formato esperado pelo DataTable
  const data: ReceitaTableRow[] = receitas.map((receita) => {
    // Determinar status considerando vencimento
    let statusFinal = receita.status;
    if (
      receita.status === 'PENDENTE' &&
      new Date(receita.dataVencimento) < new Date()
    ) {
      statusFinal = 'VENCIDA';
    }

    // Nome do cliente (ordem de prioridade)
    const clienteNome =
      receita.cliente?.nomeFantasia ||
      receita.cliente?.razaoSocial ||
      receita.cliente?.nomeCompleto ||
      '-';

    return {
      id: receita.id,
      descricao: receita.descricao,
      valor: Number(receita.valor),
      tipo: receita.tipo,
      status: statusFinal,
      dataEmissao: new Date(receita.dataEmissao),
      dataVencimento: new Date(receita.dataVencimento),
      dataRecebimento: receita.dataPagamento
        ? new Date(receita.dataPagamento)
        : null,
      categoriaNome: receita.categoria?.nome ?? '-',
      categoriaCor: receita.categoria?.cor ?? '#10B981',
      clienteNome,
      formaRecebimento: receita.formaPagamento,
    };
  });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Nenhuma receita encontrada"
        description="Não há receitas cadastradas com os filtros selecionados."
      />
    );
  }

  return <ReceitaDataTable receitas={data} />;
}
