/**
 * API: COMPRAS - LISTAGEM E CRIAÇÃO
 * Arquivo: src/app/api/estoque/compras/route.ts
 * 
 * Endpoints:
 * - GET  /api/estoque/compras - Lista compras com filtros
 * - POST /api/estoque/compras - Cria nova compra
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  validationErrorResponse,
  withErrorHandler,
  requireAuth,
  EstoquePermissions,
  getPaginationParams,
  getSortParams,
  getSearchParams,
  createPrismaOrderBy,
  createTextSearchWhere,
  mergeWhereConditions,
  logger,
  createLogContext,
  forbiddenResponse
} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/compras
 * 
 * Lista compras com paginação e filtros
 * 
 * @permissao VIEW_ESTOQUE
 * @query page, pageSize, orderBy, order, search
 * @query fornecedorId, status, dataInicio, dataFim
 */
async function getHandler(request: NextRequest) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.VIEW.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para visualizar compras');
  }
  
  // 3. LOG
  logger.info('Listando compras', createLogContext(request, user));
  
  // 4. PARÂMETROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request, 
    'dataCompra',
    ['id', 'numeroCompra', 'dataCompra', 'dataRecebimento', 'valorTotal', 'status']
  );
  const { search, filters } = getSearchParams(request);
  
  // 5. BUSCA TEXTUAL
  const searchWhere = search
    ? createTextSearchWhere(search, ['numeroCompra', 'numeroNotaFiscal', 'observacoes'])
    : {};
  
  // 6. FILTROS CUSTOMIZADOS
  const whereFilters: any = {};
  
  // Filtro por fornecedor
  if (filters?.fornecedorId) {
    whereFilters.fornecedorId = Number(filters.fornecedorId);
  }
  
  // Filtro por status
  if (filters?.status) {
    whereFilters.status = filters.status;
  }
  
  // Filtro por data de compra
  if (filters?.dataInicio || filters?.dataFim) {
    whereFilters.dataCompra = {};
    if (filters.dataInicio) {
      whereFilters.dataCompra.gte = new Date(filters.dataInicio as string);
    }
    if (filters.dataFim) {
      whereFilters.dataCompra.lte = new Date(filters.dataFim as string);
    }
  }
  
  // 7. WHERE FINAL
  const where = mergeWhereConditions(searchWhere, whereFilters);
  
  // 8. CONSULTA PRINCIPAL
  const [compras, total] = await Promise.all([
    prisma.compra.findMany({
      where,
      skip,
      take,
      orderBy: createPrismaOrderBy({ orderBy, order }),
      include: {
        fornecedor: {
          select: {
            id: true,
            nome: true,
            documento: true
          }
        },
        criador: {
          select: {
            id: true,
            nomeCompleto: true
          }
        },
        _count: {
          select: { itens: true }
        }
      }
    }),
    prisma.compra.count({ where })
  ]);
  
  // 9. ENRIQUECIMENTO
  const comprasEnriquecidas = compras.map((compra: any) => ({
    ...compra,
    totalItens: compra._count.itens,
    diasDesdeCompra: Math.ceil((Date.now() - compra.dataCompra.getTime()) / (1000 * 60 * 60 * 24)),
    entregue: compra.dataEntrega !== null
  }));
  
  // 10. LOG SUCESSO
  logger.info(
    `Compras listadas: ${total} total`,
    createLogContext(request, user)
  );
  
  // 11. RESPOSTA
  return successResponse({
    compras: {
      data: comprasEnriquecidas,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  });
}

/**
 * POST /api/estoque/compras
 * 
 * Cria nova compra com itens
 * 
 * @permissao PURCHASE_ESTOQUE
 */
async function postHandler(request: NextRequest) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.PURCHASE.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para criar compras');
  }
  
  // 3. PARSE BODY
  const body = await request.json();
  
  // 4. VALIDAÇÃO ZOD
  const compraSchema = z.object({
    fornecedorId: z.number().int().positive().optional(),
    numeroNf: z.string().max(60).optional(),
    dataCompra: z.string().transform(val => new Date(val)),
    dataEntrega: z.string().transform(val => new Date(val)).optional(),
    tipo: z.enum(['MATERIAL', 'EQUIPAMENTO', 'SERVICO']),
    projetoId: z.number().int().positive().optional(),
    valorTotal: z.number().positive(),
    desconto: z.number().optional(),
    frete: z.number().optional(),
    formaPagamento: z.string().max(60).optional(),
    observacoes: z.string().optional(),
    itens: z.array(z.object({
      tipoItem: z.enum(['MATERIAL', 'EQUIPAMENTO']),
      materialId: z.number().int().positive().optional(),
      equipamentoId: z.number().int().positive().optional(),
      loteId: z.number().int().positive().optional(),
      quantidade: z.number().positive(),
      custoUnitario: z.number().positive()
    })).min(1, 'A compra deve ter pelo menos 1 item')
  });
  
  const validation = compraSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return validationErrorResponse(errors);
  }
  
  const dados = validation.data;
  
  // 5. LOG
  logger.info('Criando compra', createLogContext(request, user), { tipo: dados.tipo });
  
  // 6. VALIDAÇÃO: fornecedor existe (se informado)?
  if (dados.fornecedorId) {
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: dados.fornecedorId }
    });
    
    if (!fornecedor) {
      return validationErrorResponse([{
        field: 'fornecedorId',
        message: 'Fornecedor não encontrado'
      }]);
    }
  }
  
  // 7. VALIDAÇÃO: projeto existe (se informado)?
  if (dados.projetoId) {
    const projeto = await prisma.projeto.findUnique({
      where: { id: dados.projetoId }
    });
    
    if (!projeto) {
      return validationErrorResponse([{
        field: 'projetoId',
        message: 'Projeto não encontrado'
      }]);
    }
  }
  
  // 8. CRIAÇÃO (com transaction)
  const compra = await prisma.$transaction(async (tx) => {
    // Cria compra
    const novaCompra = await tx.compra.create({
      data: {
        fornecedorId: dados.fornecedorId,
        numeroNf: dados.numeroNf,
        dataCompra: dados.dataCompra,
        dataEntrega: dados.dataEntrega,
        tipo: dados.tipo as any,
        projetoId: dados.projetoId,
        valorTotal: dados.valorTotal,
        desconto: dados.desconto,
        frete: dados.frete,
        formaPagamento: dados.formaPagamento,
        observacoes: dados.observacoes,
        status: 'PENDENTE',
        criadoPor: user.id
      }
    });
    
    // Cria itens
    for (const item of dados.itens) {
      const custoTotal = item.quantidade * item.custoUnitario;
      
      await tx.compraItem.create({
        data: {
          compraId: novaCompra.id,
          tipoItem: item.tipoItem,
          materialId: item.materialId,
          equipamentoId: item.equipamentoId,
          loteId: item.loteId,
          quantidade: item.quantidade,
          custoUnitario: item.custoUnitario,
          custoTotal
        }
      });
    }
    
    // Busca compra completa
    return await tx.compra.findUnique({
      where: { id: novaCompra.id },
      include: {
        fornecedor: {
          select: {
            id: true,
            nome: true,
            documento: true
          }
        },
        projeto: {
          select: {
            id: true,
            numeroProjeto: true,
            titulo: true
          }
        },
        itens: {
          include: {
            material: {
              select: {
                id: true,
                codigo: true,
                nome: true
              }
            },
            equipamento: {
              select: {
                id: true,
                codigo: true,
                nome: true
              }
            }
          }
        },
        criador: {
          select: {
            id: true,
            nomeCompleto: true
          }
        }
      }
    });
  });
  
  // 9. LOG SUCESSO
  logger.info(
    `Compra criada: ${compra!.numeroNf || compra!.id}`,
    createLogContext(request, user),
    { compraId: compra!.id }
  );
  
  // 10. RESPOSTA
  return successResponse(
    { compra },
    `Compra criada com sucesso`
  );
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
