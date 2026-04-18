// src/app/api/financeiro/receitas/[id]/recorrencia/route.ts
// POST /api/financeiro/receitas/[id]/recorrencia - Configurar recorrência em receita existente

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRecurrenceSchema } from '@/schemas/revenue.schema';
import { getAuthUser } from '@/lib/api/auth';

/**
 * POST /api/financeiro/receitas/[id]/recorrencia
 * Configurar recorrência em receita existente (que ainda não é recorrente)
 */
export async function POST(
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
      where: { id },
      include: { recorrencia: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 });
    }

    // Validar: Receita já possui recorrência
    if (existing.recorrencia) {
      return NextResponse.json(
        { error: 'Receita já possui configuração de recorrência' },
        { status: 400 }
      );
    }

    // Validar: Não pode adicionar recorrência em receita já recebida
    if (existing.status === 'RECEBIDA') {
      return NextResponse.json(
        { error: 'Não é possível adicionar recorrência em receita já recebida' },
        { status: 403 }
      );
    }

    // Parse e validação
    const body = await request.json();
    const validatedData = createRecurrenceSchema.parse(body);

    // Criar recorrência em transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar RevenueRecurrence
      const recorrencia = await tx.revenueRecurrence.create({
        data: {
          revenueId: id,
          frequencia: validatedData.frequencia,
          diaVencimento: validatedData.diaVencimento,
          dataInicio: new Date(validatedData.dataInicio),
          dataFim: validatedData.dataFim ? new Date(validatedData.dataFim) : null,
          proximaGeracao: calculateNextGeneration(
            new Date(validatedData.dataInicio),
            validatedData.frequencia
          ),
          ativo: true,
        }
      });

      // Atualizar Revenue com recorrenciaId e recorrente = true
      const updated = await tx.revenue.update({
        where: { id },
        data: {
          recorrente: true,
          recorrenciaId: recorrencia.id
        },
        include: {
          categoria: true,
          cliente: true,
          recorrencia: true,
        }
      });

      return { revenue: updated, recorrencia };
    });

    return NextResponse.json({
      success: true,
      data: result.revenue,
      message: 'Recorrência configurada com sucesso'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/financeiro/receitas/[id]/recorrencia] Error:', error);

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
      { error: 'Erro ao configurar recorrência', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calcula a próxima data de geração baseado na frequência
 */
function calculateNextGeneration(dataInicio: Date, frequencia: string): Date {
  const next = new Date(dataInicio);

  switch (frequencia) {
    case 'SEMANAL':
      next.setDate(next.getDate() + 7);
      break;
    case 'QUINZENAL':
      next.setDate(next.getDate() + 15);
      break;
    case 'MENSAL':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'BIMESTRAL':
      next.setMonth(next.getMonth() + 2);
      break;
    case 'TRIMESTRAL':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'SEMESTRAL':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'ANUAL':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}
