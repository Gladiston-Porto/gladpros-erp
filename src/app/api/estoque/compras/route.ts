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
  conflictResponse,
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
import { recalcCustoMedio } from '@/server/services/materialCostService';

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
    notaFiscalUrl: z.string().url().optional(),
    // Prompt 1: receberAgora
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
    })).min(1, 'A compra deve ter pelo menos 1 item'),
    solicitacaoCompraId: z.number().int().positive().optional(),
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

  // 9. VALIDAÇÃO: NF única por fornecedor (anti-fraude)
  if (dados.fornecedorId && dados.numeroNf) {
    const nfDuplicada = await prisma.compra.findFirst({
      where: {
        fornecedorId: dados.fornecedorId,
        numeroNf: dados.numeroNf,
      },
      select: { id: true }
    });
    if (nfDuplicada) {
      return conflictResponse(
        `NF ${dados.numeroNf} deste fornecedor já foi registrada (Compra #${nfDuplicada.id}). Verifique se não é uma duplicata.`
      );
    }
  }

  // 10. VALIDAÇÃO: SC vinculada (quando informada)
  let scValidada: {
    id: number;
    status: string;
    valorAprovado: unknown;
    valorTotalGasto: unknown;
    itens: Array<{ id: number; materialId: number | null; quantidadeSolicitada: unknown; quantidadeRecebida: unknown }>;
    compras: Array<{ valorTotal: unknown }>;
  } | null = null;

  if (dados.solicitacaoCompraId) {
    const sc = await prisma.solicitacaoCompra.findUnique({
      where: { id: dados.solicitacaoCompraId },
      include: {
        itens: {
          select: {
            id: true,
            materialId: true,
            quantidadeSolicitada: true,
            quantidadeRecebida: true,
          }
        },
        compras: {
          select: { valorTotal: true }
        }
      }
    });

    if (!sc) {
      return validationErrorResponse([{
        field: 'solicitacaoCompraId',
        message: 'Solicitação de compra não encontrada'
      }]);
    }

    if (sc.status !== 'APROVADA') {
      return validationErrorResponse([{
        field: 'solicitacaoCompraId',
        message: `A SC precisa estar APROVADA para vincular uma compra. Status atual: ${sc.status}`
      }]);
    }

    // Verificar budget disponível
    const gastoAnterior = sc.compras.reduce((sum, c) => sum + Number(c.valorTotal), 0);
    const disponivel = Number(sc.valorAprovado) - gastoAnterior;
    if (dados.valorTotal > disponivel + 0.01) { // 1 cent de tolerância para arredondamento
      return conflictResponse(
        `Budget insuficiente na SC #${sc.id}. ` +
        `Aprovado: $${Number(sc.valorAprovado).toFixed(2)}, ` +
        `Já gasto: $${gastoAnterior.toFixed(2)}, ` +
        `Disponível: $${disponivel.toFixed(2)}, ` +
        `Esta compra: $${dados.valorTotal.toFixed(2)}`
      );
    }

    // Verificar itens: cada material da compra deve estar autorizado na SC
    const scMaterialIds = sc.itens.map(i => i.materialId).filter((id): id is number => id !== null);
    for (const item of dados.itens) {
      if (item.tipoItem === 'MATERIAL' && item.materialId) {
        if (!scMaterialIds.includes(item.materialId)) {
          return validationErrorResponse([{
            field: 'itens',
            message: `Material ID ${item.materialId} não está autorizado na SC #${sc.id}. Adicione o material à SC antes de comprar.`
          }]);
        }

        // Verificar quantidade restante
        const scItem = sc.itens.find(i => i.materialId === item.materialId);
        if (scItem) {
          const qtdRestante = Number(scItem.quantidadeSolicitada) - Number(scItem.quantidadeRecebida);
          if (item.quantidade > qtdRestante + 0.001) {
            return validationErrorResponse([{
              field: 'itens',
              message: `Quantidade do material ID ${item.materialId} excede o restante na SC (restante: ${qtdRestante.toFixed(3)})`
            }]);
          }
        }
      }
    }

    scValidada = sc;
  }
  const compra = await prisma.$transaction(async (tx) => {
    // Cria compra
    const novaCompra = await tx.compra.create({
      data: {
        fornecedorId: dados.fornecedorId,
        numeroNf: dados.numeroNf,
        notaFiscalUrl: dados.notaFiscalUrl,
        dataCompra: dados.dataCompra,
        dataEntrega: dados.dataEntrega,
        tipo: dados.tipo,
        projetoId: dados.projetoId,
        solicitacaoCompraId: dados.solicitacaoCompraId,
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
        if (item.tipoItem === 'MATERIAL' && (item.materialId || item.materialEmbalagemId)) {
          // Resolve custo por unidade base e quantidade em unidade base:
          // - Se comprado via embalagem: custoUnitario é o preço por embalagem → divide por baseQtyPerUnit
          //   e quantidade é em embalagens → multiplica por baseQtyPerUnit
          // - Se comprado por unidade: já está em unidade base
          let resolvedMaterialId = item.materialId;
          let custoUnitarioBase = item.custoUnitario;
          let qtyBase = item.quantidade;
          if (item.materialEmbalagemId) {
            const emb = await tx.materialEmbalagem.findUnique({
              where: { id: item.materialEmbalagemId },
              select: { baseQtyPerUnit: true, materialId: true }
            });
            if (emb) {
              // Se materialId não veio no payload, resolve pelo embalagem
              if (!resolvedMaterialId) resolvedMaterialId = emb.materialId;
              if (Number(emb.baseQtyPerUnit) > 0) {
                custoUnitarioBase = item.custoUnitario / Number(emb.baseQtyPerUnit);
                qtyBase = item.quantidade * Number(emb.baseQtyPerUnit);
              }
            }
          }
          if (!resolvedMaterialId) continue; // skip se não conseguiu resolver

          // 1. Cria movimentação de ENTRADA (quantidade em unidade base)
          await tx.materialMovimentacao.create({
            data: {
              tipo: 'ENTRADA',
              materialId: resolvedMaterialId,
              loteId: item.loteId || null,
              quantidade: qtyBase,
              custoUnitario: custoUnitarioBase,
              localizacaoDestinoId: dados.localizacaoDestinoId!,
              localizacaoOrigemId: null,
              projetoId: dados.projetoId || null,
              motivo: `Recebimento compra #${novaCompra.id}${dados.numeroNf ? ` (NF ${dados.numeroNf})` : ''}`,
              criadoPor: Number(user.id)
            }
          });

          // 2. Atualiza saldo na localização destino (quantidade em unidade base)
          // NOTE: loteId is nullable so we can't use Prisma upsert
          // (MySQL NULL != NULL in unique index). Use findFirst + update/create instead.
          const saldoExistente = await tx.materialSaldo.findFirst({
            where: {
              materialId: resolvedMaterialId,
              loteId: item.loteId ?? null,
              localizacaoId: dados.localizacaoDestinoId!,
            },
          });

          if (saldoExistente) {
            await tx.materialSaldo.update({
              where: { id: saldoExistente.id },
              data: { quantidade: { increment: qtyBase } },
            });
          } else {
            await tx.materialSaldo.create({
              data: {
                materialId: resolvedMaterialId,
                localizacaoId: dados.localizacaoDestinoId!,
                loteId: item.loteId ?? null,
                quantidade: qtyBase,
                reservado: 0,
              },
            });
          }

          // 3. Recalcula custo médio ponderado e atualiza ultimoCusto no Material
          // MUST be called after the saldo update above so total stock reflects this receipt
          await recalcCustoMedio(tx, resolvedMaterialId, qtyBase, custoUnitarioBase);
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

    // ========================================
    // SC VINCULADA: atualizar itens + status
    // ========================================
    if (dados.solicitacaoCompraId && dados.receberAgora && scValidada) {
      // Atualizar quantidadeRecebida de cada SCItem correspondente
      for (const item of dados.itens) {
        if (item.tipoItem === 'MATERIAL' && item.materialId) {
          const scItem = scValidada.itens.find(i => i.materialId === item.materialId);
          if (scItem) {
            await tx.solicitacaoCompraItem.update({
              where: { id: scItem.id },
              data: {
                quantidadeRecebida: { increment: item.quantidade },
                status: 'RECEBIDO',
              }
            });
          }
        }
      }

      // Recalcular valorTotalGasto da SC
      await tx.solicitacaoCompra.update({
        where: { id: dados.solicitacaoCompraId },
        data: { valorTotalGasto: { increment: dados.valorTotal } }
      });

      // Verificar se todos os itens foram completamente recebidos → CONCLUIDA
      const itensAtualizados = await tx.solicitacaoCompraItem.findMany({
        where: { scId: dados.solicitacaoCompraId },
        select: { quantidadeSolicitada: true, quantidadeRecebida: true }
      });
      const todosConcluidos = itensAtualizados.every(
        i => Number(i.quantidadeRecebida) >= Number(i.quantidadeSolicitada) - 0.001
      );
      const algumRecebido = itensAtualizados.some(i => Number(i.quantidadeRecebida) > 0);

      if (todosConcluidos) {
        await tx.solicitacaoCompra.update({
          where: { id: dados.solicitacaoCompraId },
          data: { status: 'CONCLUIDA', concluidaEm: new Date() }
        });
      } else if (algumRecebido) {
        await tx.solicitacaoCompra.update({
          where: { id: dados.solicitacaoCompraId },
          data: { status: 'PARCIALMENTE_RECEBIDA' }
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
