/**
 * API Route: /api/financeiro/despesas/[id]/rejeitar
 * 
 * Endpoint para rejeitar despesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rejectExpenseSchema } from '@/schemas/expense.schema';
import { ZodError } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";

export const POST = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "update")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const expenseId = parseInt(params.id);

    if (isNaN(expenseId)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = rejectExpenseSchema.parse({
      ...body,
      expenseId
    });

    // Verificar se despesa existe
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        aprovacao: {
          include: {
            aprovador: true
          }
        }
      }
    });

    if (!expense) {
      return NextResponse.json({
        success: false,
        error: 'Despesa não encontrada'
      }, { status: 404 });
    }

    // Verificar se despesa requer aprovação
    if (!expense.requerAprovacao) {
      return NextResponse.json({
        success: false,
        error: 'Esta despesa não requer aprovação'
      }, { status: 400 });
    }

    // Verificar status
    if (expense.status !== 'AGUARDANDO_APROVACAO') {
      return NextResponse.json({
        success: false,
        error: `Não é possível rejeitar despesa com status: ${expense.status}`
      }, { status: 400 });
    }

    // Verificar se aprovação existe
    if (!expense.aprovacao) {
      return NextResponse.json({
        success: false,
        error: 'Registro de aprovação não encontrado'
      }, { status: 404 });
    }

    // Verificar se aprovador é o correto
    if (expense.aprovacao.aprovadorId !== validatedData.aprovadorId) {
      return NextResponse.json({
        success: false,
        error: 'Você não está autorizado a rejeitar esta despesa'
      }, { status: 403 });
    }

    // Verificar se aprovação já foi processada
    if (expense.aprovacao.status !== 'PENDENTE' && expense.aprovacao.status !== 'EM_ANALISE') {
      return NextResponse.json({
        success: false,
        error: `Aprovação já foi processada com status: ${expense.aprovacao.status}`
      }, { status: 400 });
    }

    // Rejeitar despesa
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Atualizar aprovação
      const updatedApproval = await tx.expenseApproval.update({
        where: { id: expense.aprovacao!.id },
        data: {
          status: 'REJEITADA',
          comentario: validatedData.comentario,
          revisadoEm: now,
          atualizadoEm: now
        },
        include: {
          aprovador: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true
            }
          }
        }
      });

      // Atualizar despesa
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: 'REJEITADA',
          atualizadoEm: now
        },
        include: {
          categoria: true,
          fornecedor: true,
          usuario: {
            select: {
              id: true,
              nomeCompleto: true,
              email: true
            }
          },
          aprovacao: {
            include: {
              aprovador: {
                select: {
                  id: true,
                  nomeCompleto: true,
                  email: true
                }
              }
            }
          }
        }
      });

      return {
        expense: updatedExpense,
        approval: updatedApproval
      };
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: "Expense",
        entidadeId: String(expenseId),
        acao: "EXPENSE_REJECTED",
        diff: JSON.stringify({ expenseId, valor: String(result.expense.valor), comentario: validatedData.comentario }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Despesa rejeitada',
      data: result.expense
    });

  });
