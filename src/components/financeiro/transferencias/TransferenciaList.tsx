import { prisma } from "@/lib/prisma";
import TransferenciaDataTable from "./TransferenciaDataTable";
import { TransferenciaTableRow } from "./TransferenciaDataTable";
import EmptyState from "../shared/EmptyState";
import { ArrowRightLeft } from "lucide-react";

export default async function TransferenciaList({
  empresaId,
}: {
  empresaId: number;
}) {
  const transfers = await prisma.bankTransfer.findMany({
    where: {
      empresaId,
    },
    include: {
      fromAccount: true,
      toAccount: true,
    },
    orderBy: {
      dataAgendamento: "desc",
    },
  });

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

  return <TransferenciaDataTable data={data} />;
}
