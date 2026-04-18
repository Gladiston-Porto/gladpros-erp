import { prisma } from '@/lib/prisma';
import DespesaDataTable from './DespesaDataTable';
import { DespesaTableRow } from './DespesaDataTable';
import EmptyState from '../shared/EmptyState';
import { FileText } from 'lucide-react';

interface DespesaListProps {
  empresaId: number;
  status?: 'PENDENTE' | 'APROVADA' | 'PAGA' | 'CANCELADA' | 'VENCIDA';
  categoriaId?: number;
  fornecedorId?: number;
  dataInicio?: Date;
  dataFim?: Date;
}

export default async function DespesaList({
  empresaId,
  status,
  categoriaId,
  fornecedorId,
  dataInicio,
  dataFim,
}: DespesaListProps) {
  // VENCIDA é status computado (PENDENTE + vencido), não existe no enum StatusDespesa
  const isVencidaFilter = status === 'VENCIDA';
  const dbStatus = isVencidaFilter ? ('PENDENTE' as const) : status;

  const despesas = await prisma.expense.findMany({
    where: {
      empresaId,
      ...(dbStatus && { status: dbStatus }),
      ...(isVencidaFilter && { dataVencimento: { lt: new Date() } }),
      ...(categoriaId && { categoriaId }),
      ...(fornecedorId && { fornecedorId }),
      ...(!isVencidaFilter && dataInicio && dataFim && {
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
      fornecedor: {
        select: {
          nome: true,
        },
      },
      usuario: {
        select: {
          nomeCompleto: true,
        },
      },
    },
    orderBy: {
      dataVencimento: 'desc',
    },
  });

  // Mapear dados do Prisma para o formato esperado pelo DataTable
  const data: DespesaTableRow[] = despesas.map((despesa) => {
    // Determinar status considerando vencimento (VENCIDA é computado, não é enum do DB)
    let statusFinal: string = despesa.status;
    if (
      despesa.status === 'PENDENTE' &&
      new Date(despesa.dataVencimento) < new Date()
    ) {
      statusFinal = 'VENCIDA';
    }

    return {
      id: despesa.id,
      descricao: despesa.descricao,
      valor: Number(despesa.valor),
      tipo: despesa.tipo,
      status: statusFinal,
      dataVencimento: new Date(despesa.dataVencimento),
      dataPagamento: despesa.dataPagamento
        ? new Date(despesa.dataPagamento)
        : null,
      categoriaNome: despesa.categoria?.nome ?? '-',
      categoriaCor: despesa.categoria?.cor ?? null,
      fornecedorNome:
        despesa.fornecedor?.nome || '-',
      formaPagamento: despesa.formaPagamento,
      requerAprovacao: despesa.requerAprovacao,
    };
  });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhuma despesa encontrada"
        description="Não há despesas cadastradas com os filtros selecionados."
      />
    );
  }

  return <DespesaDataTable despesas={data} />;
}
