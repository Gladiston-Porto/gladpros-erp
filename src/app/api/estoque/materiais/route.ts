/**
 * /api/estoque/materiais
 * 
 * Endpoints CRUD para materiais
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  paginatedResponse,
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
 * Handler GET
 */
async function handler(request: NextRequest) {
  // 1. AUTENTICAÇÃO
  try {
    const user = await requireUser(request);
    
    // 2. AUTORIZAÇÃO
    if (!can(user.role as Role, 'estoque', 'read')) {
      return forbiddenResponse('Você não tem permissão para visualizar o estoque');
    }
  
  // 3. LOG
  logger.info('Listando materiais', createLogContext(request, user as any));
  
  // 4. PARÂMETROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request, 
    'nome',
    ['id', 'nome', 'codigo', 'tipo', 'categoria', 'preco', 'createdAt', 'updatedAt']
  );
  const { search, filters } = getSearchParams(request);
  
  // 5. FILTROS CUSTOMIZADOS
  const whereFilters: any = {};
  
  // Filtro por tipo
  if (filters?.tipo) {
    whereFilters.tipo = filters.tipo;
  }
  
  // Filtro por categoria
  if (filters?.categoriaId) {
    whereFilters.categoriaId = Number(filters.categoriaId);
  }
  
  // Filtro por unidade
  if (filters?.unidadeId) {
    whereFilters.unidadeId = Number(filters.unidadeId);
  }
  
  // Filtro por status ativo/inativo
  if (filters?.ativo !== undefined) {
    whereFilters.ativo = filters.ativo === true;
  }
  
  // Filtro por estoque mínimo (alertas)
  if (filters?.abaixoMinimo === 'true') {
    // Busca materiais onde saldo < estoqueMinimo
    // Será implementado no cálculo pós-consulta
    // (requer join complexo entre saldo e material)
  }
  
  // 6. BUSCA POR TEXTO
  const searchWhere = createTextSearchWhere(search, [
    'nome',
    'codigo',
    'descricao',
    'fabricante',
    'modelo',
  ]);
  
  // 7. WHERE FINAL
  const where = mergeWhereConditions(whereFilters, searchWhere);
  
  // 8. CONSULTA PRINCIPAL
  const [materiais, total] = await Promise.all([
    prisma.material.findMany({
      where,
      skip,
      take,
      orderBy: createPrismaOrderBy({ orderBy, order }),
      include: {
        unidade: true,
        categoria: true,
        embalagens: {
          where: { ativo: true },
          select: {
            id: true,
            packageType: true,
            baseQtyPerUnit: true,
            precoCompra: true,
            purchaseUnit: true,
          },
        },
        _count: {
          select: {
            lotes: true,
            movimentacoes: true,
            saldos: true
          }
        }
      }
    }),
    prisma.material.count({ where })
  ]);
  
  // 9. ENRIQUECE COM SALDO TOTAL
  // Busca saldos de todos os materiais da página em UMA query agrupada (antes: N+1 queries)
  const materialIds = materiais.map((m: any) => m.id);
  const saldosPorMaterial = materialIds.length > 0
    ? await prisma.materialSaldo.groupBy({
        by: ['materialId'],
        where: { materialId: { in: materialIds } },
        _sum: { quantidade: true }
      })
    : [];

  const saldoMap = new Map(
    saldosPorMaterial.map(s => [s.materialId, Number(s._sum.quantidade ?? 0)])
  );

  const materiaisComSaldo = materiais.map((material: any) => {
    const saldoTotal = saldoMap.get(material.id) ?? 0;
    return {
      ...material,
      saldoTotal,
      abaixoMinimo: saldoTotal < (material.estoqueMinimo ?? 0),
      embalagens: (material.embalagens ?? []).map((e: any) => ({
        id: e.id,
        packageType: e.packageType,
        baseQtyPerUnit: Number(e.baseQtyPerUnit),
        precoCompra: e.precoCompra != null ? Number(e.precoCompra) : null,
        purchaseUnit: e.purchaseUnit ?? 'EA',
      })),
    };
  });
  
  // 10. LOG SUCESSO
  logger.info(
    `Materiais listados: ${total} total, página ${page}/${Math.ceil(total / pageSize)}`,
    createLogContext(request, user as any)
  );
  
  // 11. RESPOSTA
  return paginatedResponse(materiaisComSaldo, page, pageSize, total);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }
    throw error;
  }
}

export const GET = withErrorHandler(handler);

/**
 * POST /api/estoque/materiais
 *
 * Cria um novo material + entrada inicial de estoque em transação.
 * Payload esperado:
 *   { ...materialFields, entradaEstoque?: {...}, compra?: {...} }
 */
async function postHandler(request: NextRequest) {
  try {
    const user = await requireUser(request);

    if (!can(user.role as Role, 'estoque', 'create')) {
      return forbiddenResponse('Você não tem permissão para criar materiais');
    }

    logger.info('Criando material', createLogContext(request, user as any));

    const body = await request.json();

    // Validate material fields
    const { materialSchema } = await import('@/lib/estoque/validation');
    const validated = materialSchema.parse(body);

    // Extract entry + purchase optional blocks (stripped by materialSchema)
    const entradaEstoque = body.entradaEstoque as {
      localizacaoId: number;
      tipoEntrada: 'por_unidade' | 'em_embalagem';
      quantidadeEntrada?: number;
      valorUnitario?: number;
      packageType?: string;
      baseQtyPerUnit?: number;
      qtdEmbalagens?: number;
      precoCompra?: number;
      purchaseUnit?: string;
      brand?: string;
      upcEan?: string;
    } | undefined;

    const compraInput = body.compra as {
      fornecedorNome?: string;
      numeroNf?: string;
      dataCompra?: string;
      notaFiscalUrl?: string;
    } | undefined;

    // Derive barcode from codigo
    const barcodeInternal = validated.codigo
      ? validated.codigo.replace('-', '')
      : undefined;

    // Check for duplicate code
    if (validated.codigo) {
      const exists = await prisma.material.findFirst({ where: { codigo: validated.codigo } });
      if (exists) {
        const { conflictResponse } = await import('@/lib/api');
        return conflictResponse('Já existe um material com este código');
      }
    }

    // Run full transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Material record
      const material = await tx.material.create({
        data: {
          ...validated,
          ativo: body.ativo !== false,
          barcodeInternal: barcodeInternal ?? null,
          criadoPor: Number(user.id),
        },
        include: {
          unidade: { select: { id: true, nome: true, codigo: true } },
          categoria: { select: { id: true, nome: true } },
        },
      });

      if (!entradaEstoque) return { material };

      const localizacaoId = entradaEstoque.localizacaoId;

      // 2. Handle entry: calculate quantities and costs
      let totalQty: number;
      let custoUnitario: number;
      let compraItemQty: number;
      let compraItemCusto: number;
      let embalagemId: number | null = null;

      if (entradaEstoque.tipoEntrada === 'em_embalagem') {
        const pkgQty = entradaEstoque.baseQtyPerUnit ?? 1;
        const pkgCount = entradaEstoque.qtdEmbalagens ?? 1;
        const pkgPreco = entradaEstoque.precoCompra ?? 0;

        totalQty = pkgQty * pkgCount;
        custoUnitario = pkgPreco > 0 ? pkgPreco / pkgQty : 0;
        compraItemQty = pkgCount;
        compraItemCusto = pkgPreco;

        // Create MaterialEmbalagem record
        const emb = await tx.materialEmbalagem.create({
          data: {
            materialId: material.id,
            packageType: entradaEstoque.packageType ?? 'BOX',
            baseQtyPerUnit: pkgQty,
            purchaseUnit: entradaEstoque.purchaseUnit ?? 'EA',
            precoCompra: pkgPreco > 0 ? pkgPreco : null,
            brand: entradaEstoque.brand ?? null,
            upcEan: entradaEstoque.upcEan ?? null,
          },
        });
        embalagemId = emb.id;
      } else {
        totalQty = entradaEstoque.quantidadeEntrada ?? 0;
        custoUnitario = entradaEstoque.valorUnitario ?? 0;
        compraItemQty = totalQty;
        compraItemCusto = custoUnitario;
      }

      // 3. Find or create Fornecedor
      let fornecedorId: number | null = null;
      if (compraInput?.fornecedorNome?.trim()) {
        const nome = compraInput.fornecedorNome.trim();
        const existing = await tx.fornecedor.findFirst({ where: { nome } });
        if (existing) {
          fornecedorId = existing.id;
        } else {
          const novo = await tx.fornecedor.create({
            data: { nome },
          });
          fornecedorId = novo.id;
        }
      }

      // 4. Create Compra
      const totalCompra = compraItemQty * compraItemCusto;
      const dataCompra = compraInput?.dataCompra
        ? new Date(compraInput.dataCompra + 'T12:00:00')
        : new Date();

      const compra = await tx.compra.create({
        data: {
          tipo: 'MATERIAL',
          status: 'RECEBIDA',
          dataCompra,
          fornecedorId,
          numeroNf: compraInput?.numeroNf?.trim() ?? null,
          notaFiscalUrl: compraInput?.notaFiscalUrl ?? null,
          valorTotal: totalCompra,
          criadoPor: Number(user.id),
        },
      });

      // 5. Create CompraItem
      await tx.compraItem.create({
        data: {
          compraId: compra.id,
          tipoItem: 'MATERIAL',
          materialId: material.id,
          materialEmbalagemId: embalagemId,
          quantidade: compraItemQty,
          custoUnitario: compraItemCusto,
          dataRecebimento: new Date(),
          recebidoPor: Number(user.id),
        },
      });

      // 6. Create MaterialMovimentacao (ENTRADA)
      await tx.materialMovimentacao.create({
        data: {
          tipo: 'ENTRADA',
          materialId: material.id,
          localizacaoDestinoId: localizacaoId,
          quantidade: totalQty,
          custoUnitario: custoUnitario > 0 ? custoUnitario : null,
          compraId: compra.id,
          criadoPor: Number(user.id),
        },
      });

      // 7. Upsert MaterialSaldo (increment quantity for this location)
      const existing = await tx.materialSaldo.findFirst({
        where: { materialId: material.id, loteId: null, localizacaoId },
      });

      if (existing) {
        await tx.materialSaldo.update({
          where: { id: existing.id },
          data: { quantidade: { increment: totalQty } },
        });
      } else {
        await tx.materialSaldo.create({
          data: {
            materialId: material.id,
            loteId: null,
            localizacaoId,
            quantidade: totalQty,
            reservado: 0,
          },
        });
      }

      // 8. Update Material cost fields
      await tx.material.update({
        where: { id: material.id },
        data: {
          // On first purchase: custoMedio = ultimoCusto (no prior stock to average with)
          custoMedio: custoUnitario > 0 ? custoUnitario : undefined,
          ultimoCusto: custoUnitario > 0 ? custoUnitario : undefined,
          ultimaCompraEm: new Date(),
        },
      });

      // 9. Create Expense in financeiro so the purchase appears in financial module
      if (totalCompra > 0) {
        const empresa = await tx.empresa.findFirst({ where: { ativo: true } });
        if (empresa) {
          let categoria = await tx.expenseCategory.findFirst({
            where: { empresaId: empresa.id, nome: { contains: 'Compra' } },
          });
          if (!categoria) {
            categoria = await tx.expenseCategory.create({
              data: { empresaId: empresa.id, nome: 'Compras de Estoque', cor: '#F59E0B' },
            });
          }
          await tx.expense.create({
            data: {
              empresaId: empresa.id,
              categoriaId: categoria.id,
              fornecedorId: fornecedorId ?? null,
              descricao: `Entrada: ${validated.nome}${compraInput?.numeroNf ? ` (NF ${compraInput.numeroNf})` : ''}`,
              valor: totalCompra,
              tipo: 'FORNECEDORES',
              formaPagamento: 'BOLETO',
              status: 'PENDENTE',
              dataEmissao: dataCompra,
              dataVencimento: dataCompra,
              compraId: compra.id,
              criadoPor: Number(user.id),
            },
          });
        }
      }

      return { material, compra };
    });

    logger.info(
      `Material criado: ${result.material.nome} (ID: ${result.material.id})`,
      createLogContext(request, user as any),
      { materialId: result.material.id }
    );

    return successResponse(result.material, 'Material criado com sucesso', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }
    throw error;
  }
}

export const POST = withErrorHandler(postHandler);
