// src/app/api/financeiro/receitas/[id]/route.ts
// GET /api/financeiro/receitas/[id] - Buscar receita por ID
// PUT /api/financeiro/receitas/[id] - Atualizar receita
// DELETE /api/financeiro/receitas/[id] - Cancelar receita (soft delete)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRevenueSchema } from '@/schemas/revenue.schema';
import { getAuthUser } from '@/lib/api/auth';

/**
 * GET /api/financeiro/receitas/[id]
 * Buscar receita por ID com todos os relacionamentos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

  } catch (error: any) {
    console.error('[GET /api/financeiro/receitas/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar receita', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/financeiro/receitas/[id]
 * Atualizar receita existente
 * Regra: Não pode atualizar se status = RECEBIDA (receita já paga)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

  } catch (error: any) {
    console.error('[PUT /api/financeiro/receitas/[id]] Error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar receita', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financeiro/receitas/[id]
 * Cancelar receita (soft delete - muda status para CANCELADA)
 * Regra: Não pode cancelar se já foi recebida
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

  } catch (error: any) {
    console.error('[DELETE /api/financeiro/receitas/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao cancelar receita', details: error.message },
      { status: 500 }
    );
  }
}
