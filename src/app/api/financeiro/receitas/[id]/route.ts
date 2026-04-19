// src/app/api/financeiro/receitas/[id]/route.ts
// GET /api/financeiro/receitas/[id] - Buscar receita por ID
// PUT /api/financeiro/receitas/[id] - Atualizar receita
// DELETE /api/financeiro/receitas/[id] - Cancelar receita (soft delete)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRevenueSchema } from '@/schemas/revenue.schema';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * GET /api/financeiro/receitas/[id]
 * Buscar receita por ID com todos os relacionamentos
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const revenue = await prisma.revenue.findUnique({
      where: { id },
      include: {
        empresa: {
          select: {
            id: true,
            nome: true,
            razaoSocial: true,
          }
        },
        categoria: true,
        cliente: {
          select: {
            id: true,
            nomeCompleto: true,
            razaoSocial: true,
            email: true,
            telefone: true,
          }
        },
        recorrencia: true,
        recorrencias: {
          where: { ativo: true },
          orderBy: { proximaGeracao: 'asc' },
          take: 5, // Próximas 5 gerações
        }
      }
    });

    if (!revenue) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: revenue
    });

  });

/**
 * PUT /api/financeiro/receitas/[id]
 * Atualizar receita existente
 * Regra: Não pode atualizar se status = RECEBIDA (receita já paga)
 */
export const PUT = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "update")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Buscar receita existente
    const existing = await prisma.revenue.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });
    }

    // Validar: Não pode editar receita já recebida
    if (existing.status === 'RECEBIDA') {
      return NextResponse.json(
        { error: 'Não é possível editar receita já recebida' },
        { status: 403 }
      );
    }

    // Parse e validação
    const body = await request.json();
    const validatedData = updateRevenueSchema.parse(body);

    // Atualizar receita
    const updated = await prisma.revenue.update({
      where: { id },
      data: {
        ...(validatedData.categoriaId && { categoriaId: validatedData.categoriaId }),
        ...(validatedData.clienteId !== undefined && { clienteId: validatedData.clienteId }),
        ...(validatedData.descricao && { descricao: validatedData.descricao }),
        ...(validatedData.valor && { valor: validatedData.valor }),
        ...(validatedData.dataEmissao && { dataEmissao: new Date(validatedData.dataEmissao) }),
        ...(validatedData.dataVencimento && { dataVencimento: new Date(validatedData.dataVencimento) }),
        ...(validatedData.dataPagamento !== undefined && {
          dataPagamento: validatedData.dataPagamento ? new Date(validatedData.dataPagamento) : null
        }),
        ...(validatedData.tipo && { tipo: validatedData.tipo }),
        ...(validatedData.formaPagamento && { formaPagamento: validatedData.formaPagamento }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.observacoes !== undefined && { observacoes: validatedData.observacoes }),
      },
      include: {
        categoria: true,
        cliente: true,
        recorrencia: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Receita atualizada com sucesso'
    });

  });

/**
 * DELETE /api/financeiro/receitas/[id]
 * Cancelar receita (soft delete - muda status para CANCELADA)
 * Regra: Não pode cancelar se já foi recebida
 */
export const DELETE = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "delete")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Buscar receita
    const existing = await prisma.revenue.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });
    }

    // Validar: Não pode cancelar receita já recebida
    if (existing.status === 'RECEBIDA') {
      return NextResponse.json(
        { error: 'Não é possível cancelar receita já recebida' },
        { status: 403 }
      );
    }

    // Validar: Não pode cancelar receita já cancelada
    if (existing.status === 'CANCELADA') {
      return NextResponse.json(
        { error: 'Receita já está cancelada' },
        { status: 400 }
      );
    }

    // Soft delete: Marcar como CANCELADA
    const cancelled = await prisma.revenue.update({
      where: { id },
      data: {
        status: 'CANCELADA'
      }
    });

    return NextResponse.json({
      success: true,
      data: cancelled,
      message: 'Receita cancelada com sucesso'
    });

  });
