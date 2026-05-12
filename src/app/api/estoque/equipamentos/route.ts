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
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/equipamentos
 * 
 * Lista equipamentos com filtros, paginação e busca
 */
async function getHandler(request: NextRequest) {
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar equipamentos');
  }
  
  // 3. LOG
  logger.info('Listando equipamentos', createLogContext(request, user));
  
  // 4. PARÂMETROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request, 
    'nome',
    ['id', 'nome', 'codigo', 'tipo', 'categoria', 'status', 'createdAt', 'updatedAt']
  );
  const { search, filters } = getSearchParams(request);
  
  // 5. FILTROS CUSTOMIZADOS
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    `Equipamentos listados: ${total} total, página ${page}/${Math.ceil(total / pageSize)}`,
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
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'create')) {
    return forbiddenResponse('Você não tem permissão para criar equipamentos');
  }
  
  // 3. LOG
  logger.info('Criando equipamento', createLogContext(request, user));
  
  // 4. VALIDAÇÃO DO BODY
  const body = await request.json();
  const { equipamentoSchema } = await import('@/lib/estoque/validation');
  const validated = equipamentoSchema.parse(body);
  
  // 5. VERIFICA DUPLICAÇÃO DE CÓDIGO
  if (validated.codigo) {
    const exists = await prisma.equipamento.findFirst({
      where: { codigo: validated.codigo }
    });
    
    if (exists) {
      return conflictResponse('Já existe um equipamento com este código');
    }
  }
  
  // 6. VERIFICA DUPLICAÇÃO DE NÚMERO DE SÉRIE
  if (validated.numeroSerie) {
    const exists = await prisma.equipamento.findFirst({
      where: { numeroSerie: validated.numeroSerie }
    });
    
    if (exists) {
      return conflictResponse('Já existe um equipamento com este número de série');
    }
  }
  
  // 7. CRIA EQUIPAMENTO
  const equipamento = await prisma.equipamento.create({
    data: {
      ...validated,
      status: 'DISPONIVEL', // Novo equipamento sempre inicia como disponível
      criadoPor: Number(user.id)
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
