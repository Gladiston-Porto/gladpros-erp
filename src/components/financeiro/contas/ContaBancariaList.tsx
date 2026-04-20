import Link from 'next/link'
import { prisma } from '@/lib/prisma';
import ContaBancariaDataTable from './ContaBancariaDataTable';
import { ContaBancariaTableRow } from './ContaBancariaDataTable';
import EmptyState from '../shared/EmptyState';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ContaBancariaListProps {
  empresaId: number;
  tipo?: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CAIXA';
  ativo?: boolean;
  page?: number;
  pageSize?: number;
}

export default async function ContaBancariaList({
  empresaId,
  tipo,
  ativo = true,
  page = 1,
  pageSize = 20,
}: ContaBancariaListProps) {
  const where = {
    empresaId,
    ...(tipo && { tipo }),
    ...(ativo !== undefined && { ativo }),
  }

  const [total, contas] = await Promise.all([
    prisma.bankAccount.count({ where }),
    prisma.bankAccount.findMany({
      where,
      orderBy: [{ principal: 'desc' }, { nome: 'asc' }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ])

  // Mapear dados do Prisma para o formato esperado pelo DataTable
  const data: ContaBancariaTableRow[] = contas.map((conta) => {
    // Calcular variação de saldo
    const saldoAtual = Number(conta.saldoAtual);
    const saldoInicial = Number(conta.saldoInicial);
    const variacao = saldoAtual - saldoInicial;
    const variacaoPercentual =
      saldoInicial !== 0 ? (variacao / Math.abs(saldoInicial)) * 100 : 0;

    return {
      id: conta.id,
      nome: conta.nome,
      banco: conta.banco,
      agencia: conta.agencia,
      conta: conta.conta,
      tipo: conta.tipo,
      saldoAtual,
      saldoInicial,
      variacao,
      variacaoPercentual,
      ativo: conta.ativo,
      principal: conta.principal,
      ultimaConciliacao: conta.ultimaConciliacao
        ? new Date(conta.ultimaConciliacao)
        : undefined,
    };
  });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Nenhuma conta bancária encontrada"
        description="Não há contas bancárias cadastradas. Adicione uma conta para começar."
      />
    );
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <ContaBancariaDataTable contas={data} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {total} conta{total !== 1 ? 's' : ''} — página {page} de {totalPages}
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
