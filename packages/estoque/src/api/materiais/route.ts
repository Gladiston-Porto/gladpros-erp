/**
 * /api/estoque/materiais
 * 
 * Endpoints CRUD para materiais
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  paginatedResponse,
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
 * Handler GET
 */
async function handler(request: NextRequest) {
  // 1. AUTENTICAÃ‡ÃƒO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÃ‡ÃƒO
  if (!user || !EstoquePermissions.VIEW.includes(user.papel as any)) {
    return forbiddenResponse('VocÃª nÃ£o tem permissÃ£o para visualizar o estoque');
  }
  
  // 3. LOG
  logger.info('Listando materiais', createLogContext(request, user));
  
  // 4. PARÃ‚METROS
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
  
  // Filtro por estoque mÃ­nimo (alertas)
  if (filters?.abaixoMinimo === 'true') {
    // Busca materiais onde saldo < estoqueMinimo
    // SerÃ¡ implementado no cÃ¡lculo pÃ³s-consulta
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
  const materiaisComSaldo = await Promise.all(
    materiais.map(async (material: any) => {
      const saldoTotal = await prisma.materialSaldo.aggregate({
        where: { materialId: material.id },
        _sum: { quantidade: true }
      });
      
      return {
        ...material,
        saldoTotal: saldoTotal._sum.quantidade || 0,
        abaixoMinimo: (saldoTotal._sum.quantidade || 0) < material.estoqueMinimo
      };
    })
  );
  
  // 10. LOG SUCESSO
  logger.info(
    `Materiais listados: ${total} total, pÃ¡gina ${page}/${Math.ceil(total / pageSize)}`,
    createLogContext(request, user)
  );
  
  // 11. RESPOSTA
  return paginatedResponse(materiaisComSaldo, page, pageSize, total);
}

export const GET = withErrorHandler(handler);

/**
 * POST /api/estoque/materiais
 * 
 * Cria um novo material
 */
async function postHandler(request: NextRequest) {
  // 1. AUTENTICAÃ‡ÃƒO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÃ‡ÃƒO
  if (!user || !EstoquePermissions.MANAGE.includes(user.papel as any)) {
    return forbiddenResponse('VocÃª nÃ£o tem permissÃ£o para criar materiais');
  }
  
  // 3. LOG
  logger.info('Criando material', createLogContext(request, user));
  
  // 4. VALIDAÃ‡ÃƒO DO BODY
  const body = await request.json();
  
  // Importa validaÃ§Ã£o do Zod
  const { materialSchema } = await import('@gladpros/estoque/lib/validation');
  const validated = materialSchema.parse(body);
  
  // 5. VERIFICA DUPLICAÃ‡ÃƒO DE CÃ“DIGO
  if (validated.codigo) {
    const exists = await prisma.material.findFirst({
      where: { codigo: validated.codigo }
    });
    
    if (exists) {
      const { conflictResponse } = await import('@/lib/api');
      return conflictResponse('JÃ¡ existe um material com este cÃ³digo');
    }
  }
  
  // 6. CRIA MATERIAL
  const material = await prisma.material.create({
    data: {
      ...validated,
      criadoPor: user.id
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
    createLogContext(request, user),
    { materialId: material.id }
  );
  
  // 8. RESPOSTA
  return successResponse(material, 'Material criado com sucesso', 201);
}

export const POST = withErrorHandler(postHandler);

