import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TransferenciaDataTable from "./TransferenciaDataTable";
import { TransferenciaTableRow } from "./TransferenciaDataTable";
import EmptyState from "../shared/EmptyState";
import { ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react";

export default async function TransferenciaList({
  empresaId,
  page = 1,
  pageSize = 20,
}: {
  empresaId: number;
  page?: number;
  pageSize?: number;
}) {
  const where = { empresaId }

  const [total, transfers] = await Promise.all([
    prisma.bankTransfer.count({ where }),
    prisma.bankTransfer.findMany({
      where,
      include: { fromAccount: true, toAccount: true },
      orderBy: { dataAgendamento: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ])

  if (transfers.length === 0) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title="Nenhuma transferência encontrada"
        description="Não há transferências bancárias registradas no sistema."
      />
    );
  }

  const data: TransferenciaTableRow[] = transfers.map((transfer) => ({
    id: transfer.id,
    contaOrigemNome: transfer.fromAccount.nome,
    contaOrigemBanco: `${transfer.fromAccount.banco} - Ag: ${transfer.fromAccount.agencia}`,
    contaDestinoNome: transfer.toAccount.nome,
    contaDestinoBanco: `${transfer.toAccount.banco} - Ag: ${transfer.toAccount.agencia}`,
    valor: Number(transfer.valor),
    descricao: transfer.descricao,
    status: transfer.status,
    dataAgendamento: transfer.dataAgendamento,
    dataExecucao: transfer.dataExecucao,
    dataConclusao: transfer.dataConclusao,
  }));

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <TransferenciaDataTable data={data} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {total} transferência{total !== 1 ? 's' : ''} — página {page} de {totalPages}
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
