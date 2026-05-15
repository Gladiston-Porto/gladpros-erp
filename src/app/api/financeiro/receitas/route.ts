// src/app/api/financeiro/receitas/route.ts
// POST /api/financeiro/receitas - Criar nova receita
// GET /api/financeiro/receitas - Listar receitas com filtros

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRevenueSchema, revenueFiltersSchema } from '@/schemas/revenue.schema';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import { withErrorHandler } from '@/lib/api/error-handler';

/**
 * POST /api/financeiro/receitas
 * Criar nova receita (com ou sem recorrência)
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    // 1. Verificar autenticação e autorização
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "create")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }

    // 2. Parse e validação do body
    const body = await request.json();
    const validatedData = createRevenueSchema.parse(body);

    // empresaId always comes from JWT — never from request body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empresaId = user.empresaId;

    // 3. Verificar se empresa existe
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId }
    });

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // 4. Verificar se categoria existe
    const categoria = await prisma.revenueCategory.findUnique({
      where: { id: validatedData.categoriaId }
    });

    if (!categoria) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    // 5. Verificar cliente (se fornecido)
    if (validatedData.clienteId) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: validatedData.clienteId }
      });

      if (!cliente) {
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        );
      }
    }

    // 6. Criar receita (com ou sem recorrência)
    const revenue = await prisma.$transaction(async (tx) => {
      // Criar receita principal
      const newRevenue = await tx.revenue.create({
        data: {
          empresaId,
          categoriaId: validatedData.categoriaId,
          clienteId: validatedData.clienteId || null,
          descricao: validatedData.descricao,
          valor: validatedData.valor,
          dataEmissao: new Date(validatedData.dataEmissao),
          dataVencimento: new Date(validatedData.dataVencimento),
          dataPagamento: validatedData.dataPagamento ? new Date(validatedData.dataPagamento) : null,
          tipo: validatedData.tipo,
          formaPagamento: validatedData.formaPagamento,
          status: validatedData.status,
          observacoes: validatedData.observacoes || null,
          recorrente: validatedData.recorrente,
        },
        include: {
          categoria: true,
          cliente: true,
        }
      });

      // Se recorrente, criar configuração de recorrência
      if (validatedData.recorrente && validatedData.recorrencia) {
        const recorrencia = await tx.revenueRecurrence.create({
          data: {
            revenueId: newRevenue.id,
            frequencia: validatedData.recorrencia.frequencia,
            diaVencimento: validatedData.recorrencia.diaVencimento,
            dataInicio: new Date(validatedData.recorrencia.dataInicio),
            dataFim: validatedData.recorrencia.dataFim ? new Date(validatedData.recorrencia.dataFim) : null,
            proximaGeracao: calculateNextGeneration(
              new Date(validatedData.recorrencia.dataInicio),
              validatedData.recorrencia.frequencia
            ),
            ativo: true,
          }
        });

        // Atualizar receita com recorrenciaId
        await tx.revenue.update({
          where: { id: newRevenue.id },
          data: { recorrenciaId: recorrencia.id }
        });
      }

      return newRevenue;
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: 'Revenue',
        entidadeId: String(revenue.id),
        acao: 'RECEITA_CRIADA',
        diff: JSON.stringify({ valor: revenue.valor, descricao: revenue.descricao, status: revenue.status }),
      },
    });

    return NextResponse.json({
      success: true,
      data: revenue,
      message: validatedData.recorrente
        ? 'Receita recorrente criada com sucesso'
        : 'Receita criada com sucesso'
    }, { status: 201 });

  });

/**
 * GET /api/financeiro/receitas
 * Listar receitas com filtros, paginação e ordenação
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    // 1. Verificar autenticação e autorização
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }

    // 2. Parse query params
    const searchParams = request.nextUrl.searchParams;
    // empresaId always comes from JWT — never from query params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters = {
      empresaId: user.empresaId,
      status: searchParams.get('status') || undefined,
      categoriaId: searchParams.get('categoriaId') ? parseInt(searchParams.get('categoriaId')!) : undefined,
      clienteId: searchParams.get('clienteId') ? parseInt(searchParams.get('clienteId')!) : undefined,
      tipo: searchParams.get('tipo') || undefined,
      dataInicio: searchParams.get('dataInicio') || undefined,
      dataFim: searchParams.get('dataFim') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      orderBy: searchParams.get('orderBy') || 'dataVencimento',
      order: searchParams.get('order') || 'desc',
    };

    // 3. Validar filtros
    const validatedFilters = revenueFiltersSchema.parse(filters);

    // 4. Construir where clause
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      empresaId: validatedFilters.empresaId,
    };

    if (validatedFilters.status) {
      where.status = validatedFilters.status;
    }

    if (validatedFilters.categoriaId) {
      where.categoriaId = validatedFilters.categoriaId;
    }

    if (validatedFilters.clienteId) {
      where.clienteId = validatedFilters.clienteId;
    }

    if (validatedFilters.tipo) {
      where.tipo = validatedFilters.tipo;
    }

    if (validatedFilters.dataInicio || validatedFilters.dataFim) {
      where.dataVencimento = {};
      if (validatedFilters.dataInicio) {
        where.dataVencimento.gte = new Date(validatedFilters.dataInicio);
      }
      if (validatedFilters.dataFim) {
        where.dataVencimento.lte = new Date(validatedFilters.dataFim);
      }
    }

    // 5. Buscar receitas com paginação
    const [revenues, total] = await Promise.all([
      prisma.revenue.findMany({
        where,
        include: {
          categoria: true,
          cliente: {
            select: {
              id: true,
              nomeCompleto: true,
              razaoSocial: true,
              email: true,
            }
          },
          recorrencia: true,
        },
        orderBy: {
          [validatedFilters.orderBy]: validatedFilters.order
        },
        skip: (validatedFilters.page - 1) * validatedFilters.limit,
        take: validatedFilters.limit,
      }),
      prisma.revenue.count({ where })
    ]);

    // 6. Calcular totais
    const totais = await prisma.revenue.aggregate({
      where,
      _sum: {
        valor: true
      },
      _count: true
    });

    return NextResponse.json({
      success: true,
      data: revenues,
      pagination: {
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        total,
        totalPages: Math.ceil(total / validatedFilters.limit)
      },
      totais: {
        valorTotal: totais._sum.valor || 0,
        quantidade: totais._count
      }
    });

  });

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
