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
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

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
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar compras');
  }

  // 3. LOG
  logger.info('Listando compras', createLogContext(request, user));

  // 4. PARÂMETROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request,
    'dataCompra',
    ['id', 'dataCompra', 'dataEntrega', 'valorTotal', 'status']
  );
  const { search, filters } = getSearchParams(request);

  // 5. BUSCA TEXTUAL
  const searchWhere = search
    ? createTextSearchWhere(search, ['numeroNf', 'observacoes'])
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
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'create')) {
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
    tipo: z.enum(['MATERIAL', 'EQUIPAMENTO', 'AMBOS']),
    projetoId: z.number().int().positive().optional(),
    valorTotal: z.number().positive(),
    desconto: z.number().optional(),
    frete: z.number().optional(),
    formaPagamento: z.string().max(60).optional(),
    observacoes: z.string().optional(),
    // Novos campos - Prompt 1: receberAgora
    receberAgora: z.boolean().default(false),
    localizacaoDestinoId: z.number().int().positive().optional(),
    itens: z.array(z.object({
      tipoItem: z.enum(['MATERIAL', 'EQUIPAMENTO']),
      materialId: z.number().int().positive().optional(),
      materialEmbalagemId: z.number().int().positive().optional(), // UPC/EAN
      equipamentoId: z.number().int().positive().optional(),
      loteId: z.number().int().positive().optional(),
      quantidade: z.number().positive(),
      custoUnitario: z.number().positive()
    })).min(1, 'A compra deve ter pelo menos 1 item')
  }).refine(
    (data) => {
      // Se receberAgora=true e tem itens MATERIAL, localizacaoDestinoId é obrigatório
      if (data.receberAgora && data.itens.some(i => i.tipoItem === 'MATERIAL')) {
        return data.localizacaoDestinoId !== undefined;
      }
      return true;
    },
    {
      message: 'localizacaoDestinoId é obrigatório para recebimento imediato de materiais',
      path: ['localizacaoDestinoId']
    }
  ).refine(
    (data) => {
      // Validar que cada item tem o ID correspondente ao tipoItem
      // Para MATERIAL: pode ser materialId OU materialEmbalagemId
      return data.itens.every(item => {
        if (item.tipoItem === 'MATERIAL') {
          return item.materialId !== undefined || item.materialEmbalagemId !== undefined;
        }
        if (item.tipoItem === 'EQUIPAMENTO') return item.equipamentoId !== undefined;
        return true;
      });
    },
    {
      message: 'materialId ou materialEmbalagemId é obrigatório para itens MATERIAL, equipamentoId para EQUIPAMENTO',
      path: ['itens']
    }
  );


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

  // 8. VALIDAÇÃO: localização existe (quando receberAgora=true)?
  if (dados.receberAgora && dados.localizacaoDestinoId) {
    const localizacao = await prisma.localizacao.findUnique({
      where: { id: dados.localizacaoDestinoId }
    });

    if (!localizacao) {
      return validationErrorResponse([{
        field: 'localizacaoDestinoId',
        message: 'Localização de estoque não encontrada'
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
        tipo: dados.tipo,
        projetoId: dados.projetoId,
        valorTotal: dados.valorTotal,
        desconto: dados.desconto,
        frete: dados.frete,
        formaPagamento: dados.formaPagamento,
        observacoes: dados.observacoes,
        status: 'PENDENTE',
        criadoPor: Number(user.id)
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
          materialEmbalagemId: item.materialEmbalagemId, // UPC/EAN
          equipamentoId: item.equipamentoId,
          loteId: item.loteId,
          quantidade: item.quantidade,
          custoUnitario: item.custoUnitario,
          custoTotal
        }
      });
    }


    // ========================================
    // PROMPT 1: Recebimento Imediato
    // ========================================
    if (dados.receberAgora) {
      // Atualiza status da compra para RECEBIDA
      await tx.compra.update({
        where: { id: novaCompra.id },
        data: {
          status: 'RECEBIDA',
          dataEntrega: dados.dataEntrega || new Date()
        }
      });

      // Processa cada item MATERIAL
      for (const item of dados.itens) {
        if (item.tipoItem === 'MATERIAL' && item.materialId) {
          // 1. Cria movimentação de ENTRADA
          await tx.materialMovimentacao.create({
            data: {
              tipo: 'ENTRADA',
              materialId: item.materialId,
              loteId: item.loteId || null,
              quantidade: item.quantidade,
              localizacaoDestinoId: dados.localizacaoDestinoId!,
              localizacaoOrigemId: null,
              projetoId: dados.projetoId || null,
              motivo: `Recebimento compra #${novaCompra.id}${dados.numeroNf ? ` (NF ${dados.numeroNf})` : ''}`,
              criadoPor: Number(user.id)
            }
          });

          // 2. Atualiza saldo na localização destino
          await tx.materialSaldo.upsert({
            where: {
              materialId_loteId_localizacaoId: {
                materialId: item.materialId,
                loteId: item.loteId ?? 0,
                localizacaoId: dados.localizacaoDestinoId!
              }
            },
            create: {
              materialId: item.materialId,
              localizacaoId: dados.localizacaoDestinoId!,
              loteId: item.loteId ?? 0,
              quantidade: item.quantidade,
              reservado: 0
            },
            update: {
              quantidade: {
                increment: item.quantidade
              }
            }
          });
        }
      }

      logger.info(
        `Compra recebida imediatamente: ${dados.itens.filter(i => i.tipoItem === 'MATERIAL').length} materiais entraram no estoque`,
        createLogContext(request, user),
        { compraId: novaCompra.id, localizacaoId: dados.localizacaoDestinoId }
      );

      // Cria Expense para a compra recebida (status já é RECEBIDA)
      const empresa = await tx.empresa.findFirst({
        where: { ativo: true }
      });

      if (empresa) {
        // Buscar ou criar categoria "Compras/Estoque"
        let categoria = await tx.expenseCategory.findFirst({
          where: {
            empresaId: empresa.id,
            nome: { contains: 'Compra' }
          }
        });

        if (!categoria) {
          categoria = await tx.expenseCategory.create({
            data: {
              empresaId: empresa.id,
              nome: 'Compras de Estoque',
              cor: '#F59E0B'
            }
          });
        }

        // Criar a Expense vinculada à compra
        await tx.expense.create({
          data: {
            empresaId: empresa.id,
            categoriaId: categoria.id,
            fornecedorId: dados.fornecedorId || null,
            descricao: `Compra recebida #${novaCompra.id}${dados.numeroNf ? ` (NF ${dados.numeroNf})` : ''}`,
            valor: dados.valorTotal,
            tipo: 'FORNECEDORES',
            formaPagamento: 'BOLETO',
            status: 'PENDENTE',
            dataEmissao: new Date(dados.dataCompra),
            dataVencimento: new Date(),
            compraId: novaCompra.id,
            criadoPor: Number(user.id)
          }
        });
      }
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
