/**
 * API REST - CONTAS BANCÁRIAS
 * 
 * GET /api/financeiro/contas - Listar contas
 * POST /api/financeiro/contas - Criar nova conta
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from "@/shared/lib/rbac";
import { can, type Role } from "@/shared/lib/rbac-core";
import {
  createBankAccountSchema,
  bankAccountFiltersSchema,
  type CreateBankAccountInput
} from "@/schemas/bank-account.schema";

/**
 * GET - Listar contas bancárias com filtros
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "read")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    
    // Parse e valida filtros
    const filters = {
      empresaId: searchParams.get("empresaId") ? Number(searchParams.get("empresaId")) : undefined,
      tipo: searchParams.get("tipo") || undefined,
      ativo: searchParams.get("ativo") === "true" ? true : searchParams.get("ativo") === "false" ? false : undefined,
      principal: searchParams.get("principal") === "true" ? true : searchParams.get("principal") === "false" ? false : undefined,
      banco: searchParams.get("banco") || undefined,
      search: searchParams.get("search") || undefined
    };
    
    const validatedFilters = bankAccountFiltersSchema.parse(filters);
    
    // Build where clause
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    
    if (validatedFilters.empresaId) {
      where.empresaId = validatedFilters.empresaId;
    }
    
    if (validatedFilters.tipo) {
      where.tipo = validatedFilters.tipo;
    }
    
    if (validatedFilters.ativo !== undefined) {
      where.ativo = validatedFilters.ativo;
    }
    
    if (validatedFilters.principal !== undefined) {
      where.principal = validatedFilters.principal;
    }
    
    if (validatedFilters.banco) {
      where.banco = {
        contains: validatedFilters.banco,
        mode: "insensitive"
      };
    }
    
    if (validatedFilters.search) {
      where.OR = [
        { nome: { contains: validatedFilters.search, mode: "insensitive" } },
        { banco: { contains: validatedFilters.search, mode: "insensitive" } },
        { agencia: { contains: validatedFilters.search } },
        { conta: { contains: validatedFilters.search } }
      ];
    }
    
    // Buscar contas com agregações
    const [contas, totais] = await Promise.all([
      prisma.bankAccount.findMany({
        where,
        include: {
          empresa: {
            select: {
              id: true,
              nome: true
            }
          },
          _count: {
            select: {
              transactions: true,
              transfersFrom: true,
              transfersTo: true
            }
          }
        },
        orderBy: [
          { principal: "desc" },
          { ativo: "desc" },
          { nome: "asc" }
        ]
      }),
      
      // Estatísticas gerais
      prisma.bankAccount.aggregate({
        where,
        _sum: {
          saldoAtual: true,
          saldoInicial: true,
          limiteCredito: true
        },
        _count: true
      })
    ]);
    
    return NextResponse.json({
      success: true,
      data: contas,
      meta: {
        total: contas.length,
        saldoTotal: totais._sum.saldoAtual || 0,
        saldoInicialTotal: totais._sum.saldoInicial || 0,
        limiteTotalDisponivel: totais._sum.limiteCredito || 0
      }
    }, { status: 200 });
    
  });

/**
 * POST - Criar nova conta bancária
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, "financeiro", "create")) {
      return NextResponse.json({ error: "Forbidden", message: "Sem permissão", success: false }, { status: 403 });
    }
    const body = await request.json();
    
    // Valida dados
    const validated = createBankAccountSchema.parse(body) as CreateBankAccountInput;
    
    // Verifica se empresa existe
    const empresa = await prisma.empresa.findUnique({
      where: { id: validated.empresaId }
    });
    
    if (!empresa) {
      return NextResponse.json({
        success: false,
        message: "Empresa não encontrada"
      }, { status: 404 });
    }
    
    // Verifica se já existe conta com mesma agência/conta
    const contaExistente = await prisma.bankAccount.findUnique({
      where: {
        empresaId_banco_agencia_conta: {
          empresaId: validated.empresaId,
          banco: validated.banco,
          agencia: validated.agencia,
          conta: validated.conta
        }
      }
    });
    
    if (contaExistente) {
      return NextResponse.json({
        success: false,
        message: "Já existe uma conta com essa agência e número de conta"
      }, { status: 409 });
    }
    
    // Se definir como principal, remove principal de outras contas
    if (validated.principal) {
      await prisma.bankAccount.updateMany({
        where: {
          empresaId: validated.empresaId,
          principal: true
        },
        data: {
          principal: false
        }
      });
    }
    
    // Cria conta
    const conta = await prisma.bankAccount.create({
      data: {
        ...validated,
         
        saldoAtual: validated.saldoInicial
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      include: {
        empresa: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    });
    
    // Registra transação inicial se saldo > 0
    if (validated.saldoInicial > 0) {
      await prisma.bankTransaction.create({
        data: {
          accountId: conta.id,
          empresaId: validated.empresaId,
          tipo: "CREDITO",
          categoria: "Saldo Inicial",
          valor: validated.saldoInicial,
          descricao: "Saldo inicial da conta",
          dataTransacao: new Date(),
          saldoAnterior: 0,
          saldoPosterior: validated.saldoInicial,
          reconciliada: true,
          dataReconciliacao: new Date()
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "Conta bancária criada com sucesso",
      data: conta
    }, { status: 201 });
    
  });
