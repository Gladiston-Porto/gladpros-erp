import { prisma } from "@/lib/prisma";
import ConciliacaoDataTable from "./ConciliacaoDataTable";
import { ConciliacaoTableRow } from "./ConciliacaoDataTable";
import EmptyState from "../shared/EmptyState";
import { CheckCircle2 } from "lucide-react";

export default async function ConciliacaoList({
  empresaId,
}: {
  empresaId: number;
}) {
  // Buscar contas bancárias com suas transações
  const accounts = await prisma.bankAccount.findMany({
    where: {
      empresaId,
      ativo: true,
    },
    include: {
      transactions: {
        orderBy: {
          dataTransacao: "desc",
        },
        take: 100,
      },
    },
  });

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nenhuma conta para conciliar"
        description="Não há contas bancárias ativas para realizar conciliação."
      />
    );
  }

  // Resumo derivado de transações bancárias persistidas e flags de reconciliação.
  const data: ConciliacaoTableRow[] = accounts.map((account) => {
    const transactions = account.transactions;
    const reconciliadas = transactions.filter((t) => t.reconciliada).length;
    const pendentes = transactions.filter((t) => !t.reconciliada).length;

    const totalCreditos = transactions
      .filter((t) => 
        t.tipo === "CREDITO" || 
        t.tipo === "TRANSFERENCIA_ENTRADA" ||
        t.tipo === "JUROS"
      )
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const totalDebitos = transactions
      .filter((t) => 
        t.tipo === "DEBITO" || 
        t.tipo === "TRANSFERENCIA_SAIDA" ||
        t.tipo === "TAXA"
      )
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const saldoFinal = Number(account.saldoAtual);
    const saldoCalculado = Number(account.saldoInicial) + totalCreditos - totalDebitos;
    const diferencas = saldoFinal - saldoCalculado;

    // Determinar status
    let status = "CONCLUIDA";
    if (pendentes > 0) {
      status = "EM_ANDAMENTO";
    }
    if (Math.abs(diferencas) > 0.01) {
      status = "COM_DIFERENCAS";
    }
    if (reconciliadas === 0 && transactions.length > 0) {
      status = "PENDENTE";
    }

    // Pegar data da última transação
     
    const _ultimaTransacao = transactions[0]?.dataTransacao || new Date();

    return {
      id: account.id,
      periodo: new Date().toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
      contaNome: account.nome,
      contaBanco: `${account.banco} - Ag: ${account.agencia}`,
      saldoInicial: Number(account.saldoInicial),
      totalCreditos,
      totalDebitos,
      saldoFinal,
      saldoEsperado: saldoCalculado,
      diferencas,
      transacoesReconciliadas: reconciliadas,
      transacoesPendentes: pendentes,
      status,
      dataInicio: account.criadoEm,
      dataConclusao: account.ultimaConciliacao,
    };
  });

  return <ConciliacaoDataTable data={data} />;
}
