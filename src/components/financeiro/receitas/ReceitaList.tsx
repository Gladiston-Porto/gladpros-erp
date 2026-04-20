import Link from 'next/link'
import { prisma } from '@/lib/prisma';
import ReceitaDataTable from './ReceitaDataTable';
import { ReceitaTableRow } from './ReceitaDataTable';
import EmptyState from '../shared/EmptyState';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReceitaListProps {
  empresaId: number;
  status?: 'PENDENTE' | 'RECEBIDA' | 'CANCELADA' | 'VENCIDA';
  categoriaId?: number;
  clienteId?: number;
  dataInicio?: Date;
  dataFim?: Date;
  page?: number;
  pageSize?: number;
}

export default async function ReceitaList({
  empresaId,
  status,
  categoriaId,
  clienteId,
  dataInicio,
  dataFim,
  page = 1,
  pageSize = 20,
}: ReceitaListProps) {
  const where = {
    empresaId,
    ...(status && { status }),
    ...(categoriaId && { categoriaId }),
    ...(clienteId && { clienteId }),
    ...(dataInicio && dataFim && {
      dataVencimento: { gte: dataInicio, lte: dataFim },
    }),
  }

  const [total, receitas] = await Promise.all([
    prisma.revenue.count({ where }),
    prisma.revenue.findMany({
      where,
      include: {
        categoria: { select: { nome: true, cor: true } },
        cliente: {
          select: {
            nomeCompleto: true,
            razaoSocial: true,
            nomeFantasia: true,
          },
        },
      },
      orderBy: { dataVencimento: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ])

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

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <ReceitaDataTable receitas={data} />
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
