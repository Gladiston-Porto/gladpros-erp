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
    'marca',
    'referencia'
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
      abaixoMinimo: saldoTotal < (material.estoqueMinimo ?? 0)
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
 * Cria um novo material
 */
async function postHandler(request: NextRequest) {
  // 1. AUTENTICAÇÃO
  try {
    const user = await requireUser(request);
    
    // 2. AUTORIZAÇÃO
    if (!can(user.role as Role, 'estoque', 'create')) {
      return forbiddenResponse('Você não tem permissão para criar materiais');
    }
  
  // 3. LOG
  logger.info('Criando material', createLogContext(request, user as any));
  
  // 4. VALIDAÇÃO DO BODY
  const body = await request.json();
  
  // Importa validação do Zod
  const { materialSchema } = await import('@/lib/estoque/validation');
  const validated = materialSchema.parse(body);
  
  // 5. VERIFICA DUPLICAÇÃO DE CÓDIGO
  if (validated.codigo) {
    const exists = await prisma.material.findFirst({
      where: { codigo: validated.codigo }
    });
    
    if (exists) {
      const { conflictResponse } = await import('@/lib/api');
      return conflictResponse('Já existe um material com este código');
    }
  }
  
  // 6. CRIA MATERIAL
  const material = await prisma.material.create({
    data: {
      ...validated,
      criadoPor: Number(user.id)
    },
    include: {
      unidade: true,
      categoria: true,
      criador: {
        select: { id: true, nomeCompleto: true, email: true }
      }
    }
  });
  
  // 7. LOG SUCESSO
  logger.info(
    `Material criado: ${material.nome} (ID: ${material.id})`,
    createLogContext(request, user as any),
    { materialId: material.id }
  );
  
  // 8. RESPOSTA
  return successResponse(material, 'Material criado com sucesso', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }
    throw error;
  }
}

export const POST = withErrorHandler(postHandler);
