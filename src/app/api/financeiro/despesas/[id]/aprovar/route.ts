/**
 * API Route: /api/financeiro/despesas/[id]/aprovar
 * 
 * Endpoint para aprovar despesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { approveExpenseSchema } from '@/schemas/expense.schema';
import {  } from 'zod';
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
    const validatedData = approveExpenseSchema.parse({
      ...body,
      expenseId
    });

    // Verificar se despesa existe
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, empresaId: user.empresaId },
      include: {
        aprovacao: {
          include: {
            aprovador: true,
            proximoAprovador: true
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
        error: `Não é possível aprovar despesa com status: ${expense.status}`
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
    if (expense.aprovacao.aprovadorId !== Number(user.id)) {
      return NextResponse.json({
        success: false,
        error: 'Você não está autorizado a aprovar esta despesa'
      }, { status: 403 });
    }

    // Verificar se aprovação já foi processada
    if (expense.aprovacao.status !== 'PENDENTE') {
      return NextResponse.json({
        success: false,
        error: `Aprovação já foi processada com status: ${expense.aprovacao.status}`
      }, { status: 400 });
    }

    // Processar aprovação
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Se requer próximo nível de aprovação
      if (validatedData.requerProximoNivel && validatedData.proximoAprovadorId) {
        // Atualizar aprovação atual
        const updatedApproval = await tx.expenseApproval.update({
          where: { id: expense.aprovacao!.id },
          data: {
            status: 'EM_ANALISE',
            comentario: validatedData.comentario,
            revisadoEm: now,
            atualizadoEm: now,
            // Preparar próximo nível
            nivelAprovacao: expense.aprovacao!.nivelAprovacao + 1,
            aprovadorId: validatedData.proximoAprovadorId,
            proximoAprovadorId: null,
            requerProximoNivel: false
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

        // Despesa continua aguardando aprovação do próximo nível
        const updatedExpense = await tx.expense.update({
          where: { id: expenseId },
          data: {
            status: 'AGUARDANDO_APROVACAO', // Continua aguardando
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
          approval: updatedApproval,
          message: `Aprovação nível ${expense.aprovacao!.nivelAprovacao} concluída. Enviado para próximo aprovador.`
        };
      }

      // Aprovação final (sem próximo nível)
      const updatedApproval = await tx.expenseApproval.update({
        where: { id: expense.aprovacao!.id },
        data: {
          status: 'APROVADA',
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

      // Atualizar despesa para APROVADA
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: 'APROVADA',
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
        approval: updatedApproval,
        message: 'Despesa aprovada com sucesso'
      };
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: "Expense",
        entidadeId: String(expenseId),
        acao: "EXPENSE_APPROVED",
        diff: JSON.stringify({ expenseId, valor: String(result.expense.valor) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.expense
    });

  });
