import { prisma } from "@/lib/prisma";
import FluxoCaixaDataTable from "./FluxoCaixaDataTable";
import { FluxoCaixaTableRow } from "./FluxoCaixaDataTable";
import EmptyState from "../shared/EmptyState";
import { Wallet } from "lucide-react";

export default async function FluxoCaixaList({
  empresaId,
}: {
  empresaId: number;
}) {
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      empresaId,
    },
    include: {
      account: true,
    },
    orderBy: {
      dataTransacao: "desc",
    },
    take: 100, // Últimas 100 transações
  });

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Nenhuma transação encontrada"
        description="Não há transações bancárias registradas no sistema."
      />
    );
  }

  const data: FluxoCaixaTableRow[] = transactions.map((transaction) => ({
    id: transaction.id,
    tipo: transaction.tipo,
    categoria: transaction.categoria,
    descricao: transaction.descricao,
    valor: Number(transaction.valor),
    saldoAnterior: Number(transaction.saldoAnterior),
    saldoPosterior: Number(transaction.saldoPosterior),
    dataTransacao: transaction.dataTransacao,
    reconciliada: transaction.reconciliada,
    contaNome: transaction.account.nome,
    contaTipo: transaction.account.tipo,
  }));

  return <FluxoCaixaDataTable data={data} />;
}
