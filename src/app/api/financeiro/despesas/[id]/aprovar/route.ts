/**
 * API Route: /api/financeiro/despesas/[id]/aprovar
 * Endpoint para aprovar despesa — aprovação atômica com ledger posting
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { approveExpenseSchema } from '@/schemas/expense.schema';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';
import { postLedgerTransaction } from '@/shared/services/ledgerPostingService';
import { Decimal } from '@prisma/client/runtime/library';

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
    const expenseId = parseInt(params.id);

    if (isNaN(expenseId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = approveExpenseSchema.parse({ ...body, expenseId });

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, empresaId: user.empresaId },
      include: {
        aprovacao: {
          include: { aprovador: true, proximoAprovador: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Despesa não encontrada' },
        { status: 404 },
      );
    }
    if (!expense.requerAprovacao) {
      return NextResponse.json(
        { success: false, error: 'Esta despesa não requer aprovação' },
        { status: 400 },
      );
    }
    if (expense.status !== 'AGUARDANDO_APROVACAO') {
      return NextResponse.json(
        { success: false, error: `Não é possível aprovar despesa com status: ${expense.status}` },
        { status: 400 },
      );
    }
    if (!expense.aprovacao) {
      return NextResponse.json(
        { success: false, error: 'Registro de aprovação não encontrado' },
        { status: 404 },
      );
    }
    if (expense.aprovacao.aprovadorId !== Number(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Você não está autorizado a aprovar esta despesa' },
        { status: 403 },
      );
    }
    if (expense.aprovacao.status !== 'PENDENTE') {
      return NextResponse.json(
        {
          success: false,
          error: `Aprovação já foi processada com status: ${expense.aprovacao.status}`,
        },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const now = new Date();

        // Multi-level: forward to next approver
        if (validatedData.requerProximoNivel && validatedData.proximoAprovadorId) {
          const nextApprover = await tx.usuario.findFirst({
            where: { id: validatedData.proximoAprovadorId, empresaId: user.empresaId },
            select: { id: true },
          });
          if (!nextApprover) throw new Error('INVALID_NEXT_APPROVER');

          const updatedApproval = await tx.expenseApproval.update({
            where: { id: expense.aprovacao!.id },
            data: {
              status: 'EM_ANALISE',
              comentario: validatedData.comentario,
              revisadoEm: now,
              atualizadoEm: now,
              nivelAprovacao: expense.aprovacao!.nivelAprovacao + 1,
              aprovadorId: validatedData.proximoAprovadorId,
              proximoAprovadorId: null,
              requerProximoNivel: false,
            },
            include: { aprovador: { select: { id: true, nomeCompleto: true, email: true } } },
          });

          const updatedExpense = await tx.expense.update({
            where: { id: expenseId },
            data: { status: 'AGUARDANDO_APROVACAO', atualizadoEm: now },
            include: {
              categoria: true,
              fornecedor: true,
              usuario: { select: { id: true, nomeCompleto: true, email: true } },
              aprovacao: {
                include: { aprovador: { select: { id: true, nomeCompleto: true, email: true } } },
              },
            },
          });

          return {
            expense: updatedExpense,
            approval: updatedApproval,
            message: `Aprovação nível ${expense.aprovacao!.nivelAprovacao} concluída. Enviado para próximo aprovador.`,
          };
        }

        // Final approval
        const updatedApproval = await tx.expenseApproval.update({
          where: { id: expense.aprovacao!.id },
          data: {
            status: 'APROVADA',
            comentario: validatedData.comentario,
            revisadoEm: now,
            atualizadoEm: now,
          },
          include: { aprovador: { select: { id: true, nomeCompleto: true, email: true } } },
        });

        const updatedExpense = await tx.expense.update({
          where: { id: expenseId },
          data: { status: 'APROVADA', atualizadoEm: now },
          include: {
            categoria: true,
            fornecedor: true,
            usuario: { select: { id: true, nomeCompleto: true, email: true } },
            aprovacao: {
              include: { aprovador: { select: { id: true, nomeCompleto: true, email: true } } },
            },
          },
        });

        // Double-entry ledger posting — atomic with approval
        await postLedgerTransaction(
          {
            empresaId: expense.empresaId,
            data: now,
            descricao: `Despesa aprovada #${expenseId}: ${expense.descricao ?? ''}`,
            sourceType: 'EXPENSE_APPROVAL',
            sourceId: expenseId,
            entries: [
              {
                accountCode: 'EXPENSE',
                debit: new Decimal(expense.valor.toString()),
                memo: `Aprovação #${expenseId}`,
              },
              {
                accountCode: 'ACCOUNTS_PAYABLE',
                credit: new Decimal(expense.valor.toString()),
                memo: `A pagar #${expenseId}`,
              },
            ],
          },
          tx,
        );

        // AuditLog inside transaction — all or nothing
        await tx.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            userId: Number(user.id),
            entidade: 'Expense',
            entidadeId: String(expenseId),
            acao: 'EXPENSE_APPROVED',
            diff: JSON.stringify({ expenseId, valor: String(updatedExpense.valor) }),
          },
        });

        return {
          expense: updatedExpense,
          approval: updatedApproval,
          message: 'Despesa aprovada com sucesso',
        };
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_NEXT_APPROVER') {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Próximo aprovador não pertence à mesma empresa',
            success: false,
          },
          { status: 400 },
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true, message: result!.message, data: result!.expense });
  },
);
