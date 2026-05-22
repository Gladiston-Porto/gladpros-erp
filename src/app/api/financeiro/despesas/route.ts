/**
 * API Route: /api/financeiro/despesas
 *
 * Endpoints:
 * - GET: Lista despesas com filtros e paginação
 * - POST: Cria nova despesa (com ou sem aprovação)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createExpenseSchema,
  expenseFiltersSchema,
} from '@/schemas/expense.schema';
import { validationErrorResponse } from '@/lib/api/responses';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// ========================================
// GET: Lista despesas com filtros
// ========================================
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'financeiro', 'read')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão', success: false },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // empresaId always comes from JWT — never from query params

    const empresaIdFromJwt = user.empresaId;

    // Parse query params
    const rawFilters = {
      empresaId: empresaIdFromJwt,
      status: searchParams.get('status') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      formaPagamento: searchParams.get('formaPagamento') || undefined,
      categoriaId: searchParams.get('categoriaId') ? Number(searchParams.get('categoriaId')) : undefined,
      fornecedorId: searchParams.get('fornecedorId') ? Number(searchParams.get('fornecedorId')) : undefined,
      compraId: searchParams.get('compraId') ? Number(searchParams.get('compraId')) : undefined,
      criadoPor: searchParams.get('criadoPor') ? Number(searchParams.get('criadoPor')) : undefined,
      projetoId: searchParams.get('projetoId') ? Number(searchParams.get('projetoId')) : undefined,
      serviceOrderId: searchParams.get('serviceOrderId') ? Number(searchParams.get('serviceOrderId')) : undefined,
      valorMin: searchParams.get('valorMin') ? Number(searchParams.get('valorMin')) : undefined,
      valorMax: searchParams.get('valorMax') ? Number(searchParams.get('valorMax')) : undefined,
      dataEmissaoInicio: searchParams.get('dataEmissaoInicio') || undefined,
      dataEmissaoFim: searchParams.get('dataEmissaoFim') || undefined,
      dataVencimentoInicio: searchParams.get('dataVencimentoInicio') || undefined,
      dataVencimentoFim: searchParams.get('dataVencimentoFim') || undefined,
      dataPagamentoInicio: searchParams.get('dataPagamentoInicio') || undefined,
      dataPagamentoFim: searchParams.get('dataPagamentoFim') || undefined,
      requerAprovacao: searchParams.get('requerAprovacao') === 'true' ? true : undefined,
      aprovada: searchParams.get('aprovada') === 'true' ? true : searchParams.get('aprovada') === 'false' ? false : undefined,
      pendente: searchParams.get('pendente') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortBy: searchParams.get('sortBy') as any || 'dataVencimento',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortOrder: searchParams.get('sortOrder') as any || 'desc'
    };

    // Validar filtros
    const validation = expenseFiltersSchema.safeParse(rawFilters);

    if (!validation.success) {
      return validationErrorResponse(
        validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      );
    }

    const filters = validation.data;

    // Construir WHERE clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      empresaId: filters.empresaId
    };

    if (filters.status) where.status = filters.status;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.formaPagamento) where.formaPagamento = filters.formaPagamento;
    if (filters.categoriaId) where.categoriaId = filters.categoriaId;
    if (filters.fornecedorId) where.fornecedorId = filters.fornecedorId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((filters as any).compraId) where.compraId = (filters as any).compraId;
    if (filters.criadoPor) where.criadoPor = filters.criadoPor;
    if (filters.projetoId) where.projetoId = filters.projetoId;
    if (filters.serviceOrderId) where.serviceOrderId = filters.serviceOrderId;

    // Filtros de valor
    if (filters.valorMin || filters.valorMax) {
      where.valor = {};
      if (filters.valorMin) where.valor.gte = filters.valorMin;
      if (filters.valorMax) where.valor.lte = filters.valorMax;
    }

    // Filtros de data
    if (filters.dataEmissaoInicio || filters.dataEmissaoFim) {
      where.dataEmissao = {};
      if (filters.dataEmissaoInicio) where.dataEmissao.gte = new Date(filters.dataEmissaoInicio);
      if (filters.dataEmissaoFim) where.dataEmissao.lte = new Date(filters.dataEmissaoFim);
    }

    if (filters.dataVencimentoInicio || filters.dataVencimentoFim) {
      where.dataVencimento = {};
      if (filters.dataVencimentoInicio) where.dataVencimento.gte = new Date(filters.dataVencimentoInicio);
      if (filters.dataVencimentoFim) where.dataVencimento.lte = new Date(filters.dataVencimentoFim);
    }

    if (filters.dataPagamentoInicio || filters.dataPagamentoFim) {
      where.dataPagamento = {};
      if (filters.dataPagamentoInicio) where.dataPagamento.gte = new Date(filters.dataPagamentoInicio);
      if (filters.dataPagamentoFim) where.dataPagamento.lte = new Date(filters.dataPagamentoFim);
    }

    // Filtros de aprovação
    if (filters.requerAprovacao !== undefined) {
      where.requerAprovacao = filters.requerAprovacao;
    }

    if (filters.aprovada !== undefined) {
      where.status = filters.aprovada ? 'APROVADA' : 'REJEITADA';
    }

    if (filters.pendente) {
      where.status = 'AGUARDANDO_APROVACAO';
    }

    // Busca textual
    if (filters.search) {
      where.OR = [
        { descricao: { contains: filters.search } },
        { numeroDocumento: { contains: filters.search } },
        { observacoes: { contains: filters.search } }
      ];
    }

    // Paginação
    const skip = (filters.page - 1) * filters.limit;
    const take = filters.limit;

    // Ordenação
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any = {};
    orderBy[filters.sortBy] = filters.sortOrder;

    // Executar queries
    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          categoria: {
            select: {
              id: true,
              nome: true,
              cor: true,
              icone: true
            }
          },
          fornecedor: {
            select: {
              id: true,
              nome: true,
              documento: true
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
              }
            }
          }
        }
      }),
      prisma.expense.count({ where })
    ]);

    // Calcular estatísticas
    const stats = await prisma.expense.aggregate({
      where,
      _sum: { valor: true },
      _avg: { valor: true },
      _count: true
    });

    const totalPages = Math.ceil(totalCount / filters.limit);

    return NextResponse.json({
      success: true,
      data: expenses,
      meta: {
        total: totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1
      },
      pagination: {
        total: totalCount,
        page: filters.page,
        pageSize: filters.limit,
        totalPages,
      },
      stats: {
        totalValor: stats._sum.valor || 0,
        mediaValor: stats._avg.valor || 0,
        totalDespesas: stats._count
      }
    });

  });

// ========================================
// POST: Criar nova despesa
// ========================================
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'financeiro', 'create')) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Sem permissão', success: false },
      { status: 403 }
    );
  }

    const body = await request.json();

    // Validar dados
    const parseResult = createExpenseSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', message: parseResult.error.issues[0]?.message ?? 'Dados inválidos', success: false },
        { status: 400 },
      );
    }
    const validatedData = parseResult.data;

    // empresaId always comes from JWT — never from request body

    const empresaId = user.empresaId;

    const [category, fornecedor, projeto, serviceOrder, aprovador, proximoAprovador] = await Promise.all([
      prisma.expenseCategory.findFirst({
        where: { id: validatedData.categoriaId, empresaId, ativo: true },
        select: { id: true, dedutivel: true, slug: true, scheduleCLine: true },
      }),
      validatedData.fornecedorId
        ? prisma.fornecedor.findFirst({
          where: { id: validatedData.fornecedorId, ativo: true },
          select: { id: true },
        })
        : Promise.resolve(null),
      validatedData.projetoId
        ? prisma.projeto.findUnique({ where: { id: validatedData.projetoId }, select: { id: true } })
        : Promise.resolve(null),
      validatedData.serviceOrderId
        ? prisma.serviceOrder.findUnique({ where: { id: validatedData.serviceOrderId }, select: { id: true } })
        : Promise.resolve(null),
      validatedData.requerAprovacao && validatedData.aprovacao?.aprovadorId
        ? prisma.usuario.findFirst({
          where: {
            id: validatedData.aprovacao.aprovadorId,
            status: 'ATIVO',
            bloqueado: false,
            nivel: { in: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
          },
          select: { id: true },
        })
        : Promise.resolve(null),
      validatedData.requerAprovacao && validatedData.aprovacao?.proximoAprovadorId
        ? prisma.usuario.findFirst({
          where: {
            id: validatedData.aprovacao.proximoAprovadorId,
            status: 'ATIVO',
            bloqueado: false,
            nivel: { in: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
          },
          select: { id: true },
        })
        : Promise.resolve(null),
    ]);

    if (!category) {
      return NextResponse.json({ error: 'Validation failed', message: 'Categoria de despesa inválida ou inativa', success: false }, { status: 400 });
    }
    if (validatedData.fornecedorId && !fornecedor) {
      return NextResponse.json({ error: 'Validation failed', message: 'Fornecedor inválido ou inativo', success: false }, { status: 400 });
    }
    if (validatedData.projetoId && !projeto) {
      return NextResponse.json({ error: 'Validation failed', message: 'Projeto vinculado não encontrado', success: false }, { status: 400 });
    }
    if (validatedData.serviceOrderId && !serviceOrder) {
      return NextResponse.json({ error: 'Validation failed', message: 'Ordem de serviço vinculada não encontrada', success: false }, { status: 400 });
    }
    if (validatedData.requerAprovacao && (!validatedData.aprovacao?.aprovadorId || !aprovador)) {
      return NextResponse.json({ error: 'Validation failed', message: 'Aprovador inválido para esta despesa', success: false }, { status: 400 });
    }
    if (validatedData.aprovacao?.proximoAprovadorId && !proximoAprovador) {
      return NextResponse.json({ error: 'Validation failed', message: 'Próximo aprovador inválido', success: false }, { status: 400 });
    }
    if (validatedData.aprovacao?.aprovadorId === Number(user.id)) {
      return NextResponse.json({ error: 'Validation failed', message: 'O criador da despesa não pode ser o próprio aprovador', success: false }, { status: 400 });
    }

    // Iniciar transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar despesa
      const expense = await tx.expense.create({
        data: {
          empresaId,
          categoriaId: validatedData.categoriaId,
          fornecedorId: validatedData.fornecedorId,
          descricao: validatedData.descricao,
          valor: validatedData.valor,
          tipo: validatedData.tipo,
          formaPagamento: validatedData.formaPagamento,
          status: validatedData.requerAprovacao ? 'AGUARDANDO_APROVACAO' : 'PENDENTE',
          projetoId: validatedData.projetoId ?? null,
          serviceOrderId: validatedData.serviceOrderId ?? null,
          isBillableToClient: validatedData.isBillableToClient ?? false,
          costCategory: validatedData.costCategory ?? null,
          dataEmissao: validatedData.dataEmissao,
          dataVencimento: validatedData.dataVencimento,
          dataPagamento: null,
          requerAprovacao: validatedData.requerAprovacao,
          anexoUrl: validatedData.anexoUrl,
          numeroDocumento: validatedData.numeroDocumento,
          observacoes: validatedData.observacoes,
          dedutivel: category.dedutivel,
          percentualDedutivel: category.slug === 'meals' || category.scheduleCLine === 'Line 24b' ? 50 : null,
          criadoPor: Number(user!.id)
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
          }
        }
      });

      // Se requer aprovação, criar registro de aprovação
      if (validatedData.requerAprovacao && validatedData.aprovacao) {
        const aprovacao = await tx.expenseApproval.create({
          data: {
            expenseId: expense.id,
            status: 'PENDENTE',
            aprovadorId: validatedData.aprovacao.aprovadorId,
            tipoAprovador: validatedData.aprovacao.tipoAprovador,
            nivelAprovacao: validatedData.aprovacao.nivelAprovacao,
            requerProximoNivel: validatedData.aprovacao.requerProximoNivel,
            proximoAprovadorId: validatedData.aprovacao.proximoAprovadorId,
            justificativa: validatedData.aprovacao.justificativa
          },
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
        });

        // Atualizar expense com aprovacaoId
        await tx.expense.update({
          where: { id: expense.id },
          data: { aprovacaoId: aprovacao.id }
        });

        return { ...expense, aprovacao };
      }

      return expense;
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: Number(user.id),
        entidade: 'Expense',
        entidadeId: String(result.id),
        acao: 'DESPESA_CRIADA',
        diff: JSON.stringify({ valor: result.valor, descricao: result.descricao, status: result.status }),
      },
    });

    return NextResponse.json({
      success: true,
      message: validatedData.requerAprovacao
        ? 'Despesa criada e enviada para aprovação'
        : 'Despesa criada com sucesso',
      data: result
    }, { status: 201 });

  });
