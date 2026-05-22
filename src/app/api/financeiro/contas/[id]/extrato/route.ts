/**
 * API REST - EXTRATO BANCÁRIO
 * 
 * GET /api/financeiro/contas/[id]/extrato - Obter extrato da conta
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import {
  bankTransactionFiltersSchema,
  validarPeriodoExtrato
} from "@/schemas/bank-account.schema";

/**
 * GET - Obter extrato bancário com filtros
 */
export const GET = withErrorHandler(async (request: NextRequest,
  context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const params = await context.params;
    const accountId = parseInt(params.id);
    
    if (isNaN(accountId)) {
      return NextResponse.json({
        success: false,
        message: "ID da conta inválido"
      }, { status: 400 });
    }
    
    // Verifica se conta existe
    const conta = await prisma.bankAccount.findFirst({
      where: { id: accountId, empresaId: user.empresaId },
      select: {
        id: true,
        nome: true,
        banco: true,
        agencia: true,
        conta: true,
        digito: true,
        saldoAtual: true,
        tipo: true
      }
    });
    
    if (!conta) {
      return NextResponse.json({
        success: false,
        message: "Conta não encontrada"
      }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse filtros
    const filters = {
      accountId,
      tipo: searchParams.get("tipo") || undefined,
      categoria: searchParams.get("categoria") || undefined,
      reconciliada: searchParams.get("reconciliada") === "true" ? true : 
                    searchParams.get("reconciliada") === "false" ? false : undefined,
      dataInicio: searchParams.get("dataInicio") ? new Date(searchParams.get("dataInicio")!) : undefined,
      dataFim: searchParams.get("dataFim") ? new Date(searchParams.get("dataFim")!) : undefined,
      valorMin: searchParams.get("valorMin") ? parseFloat(searchParams.get("valorMin")!) : undefined,
      valorMax: searchParams.get("valorMax") ? parseFloat(searchParams.get("valorMax")!) : undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50
    };
    
    const validatedFilters = bankTransactionFiltersSchema.parse(filters);
    
    // Valida período se fornecido
    if (validatedFilters.dataInicio && validatedFilters.dataFim) {
      const validacaoPeriodo = validarPeriodoExtrato(
        validatedFilters.dataInicio,
        validatedFilters.dataFim
      );
      
      if (!validacaoPeriodo.valido) {
        return NextResponse.json({
          success: false,
          message: validacaoPeriodo.mensagem
        }, { status: 400 });
      }
    }
    
    // Build where clause
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { accountId };
    
    if (validatedFilters.tipo) {
      where.tipo = validatedFilters.tipo;
    }
    
    if (validatedFilters.categoria) {
      where.categoria = validatedFilters.categoria;
    }
    
    if (validatedFilters.reconciliada !== undefined) {
      where.reconciliada = validatedFilters.reconciliada;
    }
    
    if (validatedFilters.dataInicio || validatedFilters.dataFim) {
      where.dataTransacao = {};
      
      if (validatedFilters.dataInicio) {
        where.dataTransacao.gte = validatedFilters.dataInicio;
      }
      
      if (validatedFilters.dataFim) {
        where.dataTransacao.lte = validatedFilters.dataFim;
      }
    }
    
    if (validatedFilters.valorMin || validatedFilters.valorMax) {
      where.valor = {};
      
      if (validatedFilters.valorMin) {
        where.valor.gte = validatedFilters.valorMin;
      }
      
      if (validatedFilters.valorMax) {
        where.valor.lte = validatedFilters.valorMax;
      }
    }
    
    if (validatedFilters.search) {
      where.OR = [
        { descricao: { contains: validatedFilters.search, mode: "insensitive" } },
        { documento: { contains: validatedFilters.search, mode: "insensitive" } },
        { categoria: { contains: validatedFilters.search, mode: "insensitive" } }
      ];
    }
    
    // Calcula paginação
    const skip = (validatedFilters.page - 1) * validatedFilters.limit;
    
    // Busca transações e totais
    const [transacoes, total, resumo] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        include: {
          revenue: {
            select: {
              id: true,
              descricao: true,
              valor: true
            }
          },
          expense: {
            select: {
              id: true,
              descricao: true,
              valor: true
            }
          },
          transfer: {
            select: {
              id: true,
              descricao: true,
              status: true
            }
          }
        },
        orderBy: [
          { dataTransacao: "desc" },
          { id: "desc" }
        ],
        skip,
        take: validatedFilters.limit
      }),
      
      prisma.bankTransaction.count({ where }),
      
      prisma.bankTransaction.groupBy({
        by: ["tipo"],
        where,
        _sum: {
          valor: true
        },
        _count: true
      })
    ]);
    
     
    // Agrupa resumo por tipo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resumoPorTipo = resumo.reduce((acc: any, item) => {
      acc[item.tipo] = {
        total: item._sum.valor || 0,
        quantidade: item._count
      };
      return acc;
    }, {});
    
    // Calcula totais gerais
    const totalCreditos = resumo
      .filter(r => ["CREDITO", "TRANSFERENCIA_ENTRADA", "JUROS"].includes(r.tipo))
      .reduce((sum, r) => sum + (Number(r._sum.valor) || 0), 0);
    
    const totalDebitos = resumo
      .filter(r => ["DEBITO", "TRANSFERENCIA_SAIDA", "TAXA"].includes(r.tipo))
      .reduce((sum, r) => sum + (Number(r._sum.valor) || 0), 0);
    
    // Busca categorias únicas
    const categorias = await prisma.bankTransaction.groupBy({
      by: ["categoria"],
      where: {
        ...where,
        categoria: { not: null }
      },
      _count: true,
      orderBy: {
        _count: {
          categoria: "desc"
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        conta,
        transacoes,
        resumo: {
          porTipo: resumoPorTipo,
          totalCreditos,
          totalDebitos,
          saldoPeriodo: totalCreditos - totalDebitos
        },
        categorias: categorias.map(c => ({
          nome: c.categoria,
          quantidade: c._count
        })),
        pagination: {
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          total,
          totalPages: Math.ceil(total / validatedFilters.limit)
        }
      }
    }, { status: 200 });
    
  });
