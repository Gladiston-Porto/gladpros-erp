import Link from 'next/link'
import { prisma } from '@/lib/prisma';
import DespesaDataTable from './DespesaDataTable';
import { DespesaTableRow } from './DespesaDataTable';
import EmptyState from '../shared/EmptyState';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface DespesaListProps {
  empresaId: number;
  status?: 'PENDENTE' | 'APROVADA' | 'PAGA' | 'CANCELADA' | 'VENCIDA';
  categoriaId?: number;
  fornecedorId?: number;
  dataInicio?: Date;
  dataFim?: Date;
  page?: number;
  pageSize?: number;
}

export default async function DespesaList({
  empresaId,
  status,
  categoriaId,
  fornecedorId,
  dataInicio,
  dataFim,
  page = 1,
  pageSize = 20,
}: DespesaListProps) {
  const isVencidaFilter = status === 'VENCIDA';
  const dbStatus = isVencidaFilter ? ('PENDENTE' as const) : status;

  const where = {
    empresaId,
    ...(dbStatus && { status: dbStatus }),
    ...(isVencidaFilter && { dataVencimento: { lt: new Date() } }),
    ...(categoriaId && { categoriaId }),
    ...(fornecedorId && { fornecedorId }),
    ...(!isVencidaFilter && dataInicio && dataFim && {
      dataVencimento: { gte: dataInicio, lte: dataFim },
    }),
  }

  const [total, despesas] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: {
        categoria: { select: { nome: true, cor: true } },
        fornecedor: { select: { nome: true } },
        usuario: { select: { nomeCompleto: true } },
      },
      orderBy: { dataVencimento: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ])

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

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <DespesaDataTable despesas={data} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {total} resultado{total !== 1 ? 's' : ''} — página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="flex items-center gap-1 rounded-2xl border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}`}
                className="flex items-center gap-1 rounded-2xl border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                aria-label="Próxima página"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
