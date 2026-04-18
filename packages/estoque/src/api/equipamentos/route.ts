/**
 * /api/estoque/equipamentos
 * 
 * Endpoints CRUD para equipamentos
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
  forbiddenResponse,
  conflictResponse
} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/equipamentos
 * 
 * Lista equipamentos com filtros, paginaÃ§Ã£o e busca
 */
async function getHandler(request: NextRequest) {
  // 1. AUTENTICAÃ‡ÃƒO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÃ‡ÃƒO
  if (!user || !EstoquePermissions.VIEW.includes(user.papel as any)) {
    return forbiddenResponse('VocÃª nÃ£o tem permissÃ£o para visualizar equipamentos');
  }
  
  // 3. LOG
  logger.info('Listando equipamentos', createLogContext(request, user));
  
  // 4. PARÃ‚METROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request, 
    'nome',
    ['id', 'nome', 'codigo', 'tipo', 'categoria', 'status', 'createdAt', 'updatedAt']
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
  
  // Filtro por status
  if (filters?.status) {
    whereFilters.status = filters.status;
  }
  
  // Filtro por fornecedor
  if (filters?.fornecedorId) {
    whereFilters.fornecedorId = Number(filters.fornecedorId);
  }
  
  // Filtro por ativo/inativo
  if (filters?.ativo !== undefined) {
    whereFilters.ativo = filters.ativo === true;
  }
  
  // Filtro por disponibilidade
  if (filters?.disponivel === 'true') {
    whereFilters.status = 'DISPONIVEL';
  }
  
  // Filtro por equipamentos em uso
  if (filters?.emUso === 'true') {
    whereFilters.status = 'EM_USO';
  }
  
  // 6. BUSCA POR TEXTO
  const searchWhere = createTextSearchWhere(search, [
    'nome',
    'codigo',
    'descricao',
    'marca',
    'modelo',
    'numeroSerie'
  ]);
  
  // 7. WHERE FINAL
  const where = mergeWhereConditions(whereFilters, searchWhere);
  
  // 8. CONSULTA PRINCIPAL
  const [equipamentos, total] = await Promise.all([
    prisma.equipamento.findMany({
      where,
      skip,
      take,
      orderBy: createPrismaOrderBy({ orderBy, order }),
      include: {
        categoria: true,
        fornecedor: {
          select: { id: true, nome: true }
        },
        projetoAtual: {
          select: { id: true }
        },
        _count: {
          select: {
            projetoEquipamentos: true,
            manutencoes: true
          }
        }
      }
    }),
    prisma.equipamento.count({ where })
  ]);
  
  // 9. ENRIQUECE COM DADOS ADICIONAIS
  const equipamentosEnriquecidos = equipamentos.map((equip: any) => ({
    ...equip,
    emUso: equip.status === 'EM_USO',
    precisaManutencao: equip.status === 'EM_MANUTENCAO' || 
      (equip.proximaManutencao && new Date(equip.proximaManutencao) < new Date()),
    precisaCalibracao: equip.status === 'CALIBRACAO' ||
      (equip.proximaCalibracao && new Date(equip.proximaCalibracao) < new Date())
  }));
  
  // 10. LOG SUCESSO
  logger.info(
    `Equipamentos listados: ${total} total, pÃ¡gina ${page}/${Math.ceil(total / pageSize)}`,
    createLogContext(request, user)
  );
  
  // 11. RESPOSTA
  return paginatedResponse(equipamentosEnriquecidos, page, pageSize, total);
}

export const GET = withErrorHandler(getHandler);

/**
 * POST /api/estoque/equipamentos
 * 
 * Cria um novo equipamento
 */
async function postHandler(request: NextRequest) {
  // 1. AUTENTICAÃ‡ÃƒO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÃ‡ÃƒO
  if (!user || !EstoquePermissions.MANAGE.includes(user.papel as any)) {
    return forbiddenResponse('VocÃª nÃ£o tem permissÃ£o para criar equipamentos');
  }
  
  // 3. LOG
  logger.info('Criando equipamento', createLogContext(request, user));
  
  // 4. VALIDAÃ‡ÃƒO DO BODY
  const body = await request.json();
  const { equipamentoSchema } = await import('@gladpros/estoque/lib/validation');
  const validated = equipamentoSchema.parse(body);
  
  // 5. VERIFICA DUPLICAÃ‡ÃƒO DE CÃ“DIGO
  if (validated.codigo) {
    const exists = await prisma.equipamento.findFirst({
      where: { codigo: validated.codigo }
    });
    
    if (exists) {
      return conflictResponse('JÃ¡ existe um equipamento com este cÃ³digo');
    }
  }
  
  // 6. VERIFICA DUPLICAÃ‡ÃƒO DE NÃšMERO DE SÃ‰RIE
  if (validated.numeroSerie) {
    const exists = await prisma.equipamento.findFirst({
      where: { numeroSerie: validated.numeroSerie }
    });
    
    if (exists) {
      return conflictResponse('JÃ¡ existe um equipamento com este nÃºmero de sÃ©rie');
    }
  }
  
  // 7. CRIA EQUIPAMENTO
  const equipamento = await prisma.equipamento.create({
    data: {
      ...validated,
      status: 'DISPONIVEL', // Novo equipamento sempre inicia como disponÃ­vel
      criadoPor: user.id
    },
    include: {
      categoria: true,
      fornecedor: {
        select: { id: true, nome: true }
      },
      criador: {
        select: { id: true, nomeCompleto: true, email: true }
      }
    }
  });
  
  // 8. LOG SUCESSO
  logger.info(
    `Equipamento criado: ${equipamento.nome} (ID: ${equipamento.id})`,
    createLogContext(request, user),
    { equipamentoId: equipamento.id }
  );
  
  // 9. RESPOSTA
  return successResponse(equipamento, 'Equipamento criado com sucesso', 201);
}

export const POST = withErrorHandler(postHandler);

