/**
 * API REST - RECONCILIAÇÃO BANCÁRIA
 * POST /api/financeiro/contas/[id]/reconciliar
 * Reconciliação atômica com guard de concorrência via snapshot de ultimaConciliacao
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import {
  reconcileBankTransactionsSchema,
  type ReconcileBankTransactionsInput,
} from '@/schemas/bank-account.schema';

export const POST = withErrorHandler(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'financeiro', 'update')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 },
      );
    }
    const params = await context.params;
    const accountId = parseInt(params.id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { success: false, message: 'ID da conta inválido' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validated = reconcileBankTransactionsSchema.parse(body) as ReconcileBankTransactionsInput;

    // Read conta with ultimaConciliacao snapshot — used as optimistic concurrency guard
    const conta = await prisma.bankAccount.findFirst({
      where: { id: accountId, empresaId: user.empresaId },
      select: { id: true, nome: true, ativo: true, ultimaConciliacao: true },
    });

    if (!conta) {
      return NextResponse.json(
        { success: false, message: 'Conta não encontrada' },
        { status: 404 },
      );
    }

    const snapshotUltimaConciliacao = conta.ultimaConciliacao;

    const transacoes = await prisma.bankTransaction.findMany({
      where: {
        id: { in: validated.transactionIds },
        accountId,
        empresaId: user.empresaId,
      },
      select: { id: true, descricao: true, valor: true, reconciliada: true },
    });

    if (transacoes.length !== validated.transactionIds.length) {
      const encontradas = transacoes.map((t) => t.id);
      const naoEncontradas = validated.transactionIds.filter((id) => !encontradas.includes(id));
      return NextResponse.json(
        {
          success: false,
          message: 'Algumas transações não foram encontradas ou não pertencem a esta conta',
          details: { naoEncontradas },
        },
        { status: 404 },
      );
    }

    const jaReconciliadas = transacoes.filter((t) => t.reconciliada);
    const aReconciliar = transacoes.filter((t) => !t.reconciliada);

    if (aReconciliar.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Todas as transações selecionadas já estão reconciliadas' },
        { status: 400 },
      );
    }

    const dataReconciliacao = validated.dataReconciliacao || new Date();

    let resultado;
    try {
      resultado = await prisma.$transaction(async (tx) => {
        // Optimistic concurrency guard: compare ultimaConciliacao inside the transaction
        const contaAtual = await tx.bankAccount.findFirst({
          where: { id: accountId, empresaId: user.empresaId },
          select: { ultimaConciliacao: true },
        });

        const snapshotMs = snapshotUltimaConciliacao?.getTime() ?? null;
        const currentMs = contaAtual?.ultimaConciliacao?.getTime() ?? null;

        if (snapshotMs !== currentMs) {
          throw new Error('RECONCILIATION_CONFLICT');
        }

        await tx.bankTransaction.updateMany({
          where: { id: { in: aReconciliar.map((t) => t.id) } },
          data: { reconciliada: true, dataReconciliacao },
        });

        await tx.bankAccount.update({
          where: { id: accountId },
          data: { ultimaConciliacao: dataReconciliacao },
        });

        await tx.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            userId: Number(user.id),
            entidade: 'BankReconciliation',
            entidadeId: String(accountId),
            acao: 'RECONCILE',
            diff: JSON.stringify({
              accountId,
              transactionIds: aReconciliar.map((t) => t.id),
              reconciliadas: aReconciliar.length,
              jaReconciliadas: jaReconciliadas.length,
              dataReconciliacao: dataReconciliacao.toISOString(),
            }),
          },
        });

        return {
          reconciliadas: aReconciliar.length,
          jaReconciliadas: jaReconciliadas.length,
          transacoes: aReconciliar,
        };
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'RECONCILIATION_CONFLICT') {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: 'Esta conta foi reconciliada simultaneamente. Recarregue e tente novamente.',
            success: false,
          },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json(
      {
        success: true,
        message: `${resultado.reconciliadas} transação(ões) reconciliada(s) com sucesso`,
        data: {
          reconciliadas: resultado.reconciliadas,
          jaReconciliadas: resultado.jaReconciliadas,
          dataReconciliacao,
          transacoes: resultado.transacoes.map((t) => ({
            id: t.id,
            descricao: t.descricao,
            valor: t.valor,
          })),
        },
      },
      { status: 200 },
    );
  },
);
