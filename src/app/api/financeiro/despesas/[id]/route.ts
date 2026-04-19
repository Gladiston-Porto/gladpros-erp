/**
 * API Route: /api/financeiro/despesas/[id]
 * 
 * Endpoints:
 * - GET: Obter detalhes de uma despesa
 * - PUT: Atualizar despesa
 * - DELETE: Cancelar despesa (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateExpenseSchema } from '@/schemas/expense.schema';
import { ZodError } from 'zod';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";

// ========================================
// GET: Detalhes da despesa
// ========================================
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            cor: true,
            icone: true,
            orcamentoMensal: true
          }
        },
        fornecedor: {
          select: {
            id: true,
            nome: true,
            documento: true,
            email: true,
            telefone: true
          }
        },
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
            },
            proximoAprovador: {
              select: {
                id: true,
                nomeCompleto: true,
                email: true
              }
            }
          }
        },
        empresa: {
          select: {
            id: true,
            nome: true
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

    return NextResponse.json({
      success: true,
      data: expense
    });

  });

// ========================================
// PUT: Atualizar despesa
// ========================================
export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "update")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    // Verificar se despesa existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: { aprovacao: true }
    });

    if (!existingExpense) {
      return NextResponse.json({
        success: false,
        error: 'Despesa não encontrada'
      }, { status: 404 });
    }

    // Verificar se pode editar
    if (existingExpense.status === 'PAGA') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível editar despesa já paga'
      }, { status: 400 });
    }

    if (existingExpense.status === 'CANCELADA') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível editar despesa cancelada'
      }, { status: 400 });
    }

    // Se está aguardando aprovação, só pode editar se reprovar primeiro
    if (existingExpense.status === 'AGUARDANDO_APROVACAO') {
      return NextResponse.json({
        success: false,
        error: 'Despesa aguardando aprovação. Cancele a solicitação antes de editar.'
      }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateExpenseSchema.parse(body);

    // Atualizar despesa
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        ...validatedData,
        atualizadoEm: new Date()
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

    return NextResponse.json({
      success: true,
      message: 'Despesa atualizada com sucesso',
      data: updatedExpense
    });

  });

// ========================================
// DELETE: Cancelar despesa (soft delete)
// ========================================
export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "delete")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    // Verificar se despesa existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: { aprovacao: true }
    });

    if (!existingExpense) {
      return NextResponse.json({
        success: false,
        error: 'Despesa não encontrada'
      }, { status: 404 });
    }

    // Verificar se pode cancelar
    if (existingExpense.status === 'PAGA') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível cancelar despesa já paga. Solicite estorno.'
      }, { status: 400 });
    }

    if (existingExpense.status === 'CANCELADA') {
      return NextResponse.json({
        success: false,
        error: 'Despesa já está cancelada'
      }, { status: 400 });
    }

    // Cancelar despesa e aprovação (se houver)
    await prisma.$transaction(async (tx) => {
      // Cancelar despesa
      await tx.expense.update({
        where: { id },
        data: {
          status: 'CANCELADA',
          atualizadoEm: new Date()
        }
      });

      // Cancelar aprovação pendente
      if (existingExpense.aprovacaoId) {
        await tx.expenseApproval.update({
          where: { id: existingExpense.aprovacaoId },
          data: {
            status: 'CANCELADA',
            atualizadoEm: new Date()
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Despesa cancelada com sucesso'
    });

  });
