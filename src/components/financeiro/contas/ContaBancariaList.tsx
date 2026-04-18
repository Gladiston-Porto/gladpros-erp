import { prisma } from '@/lib/prisma';
import ContaBancariaDataTable from './ContaBancariaDataTable';
import { ContaBancariaTableRow } from './ContaBancariaDataTable';
import EmptyState from '../shared/EmptyState';
import { Building2 } from 'lucide-react';

interface ContaBancariaListProps {
  empresaId: number;
  tipo?: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CAIXA';
  ativo?: boolean;
}

export default async function ContaBancariaList({
  empresaId,
  tipo,
  ativo = true,
}: ContaBancariaListProps) {
  const contas = await prisma.bankAccount.findMany({
    where: {
      empresaId,
      ...(tipo && { tipo }),
      ...(ativo !== undefined && { ativo }),
    },
    orderBy: [
      { principal: 'desc' }, // Contas principais primeiro
      { nome: 'asc' },
    ],
  });

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

  return <ContaBancariaDataTable contas={data} />;
}
