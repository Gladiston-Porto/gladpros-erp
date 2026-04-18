/**
 * /api/estoque/movimentacoes
 * 
 * Endpoints para movimentaÃ§Ãµes de estoque
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
  mergeWhereConditions,
  logger,
  createLogContext,
  forbiddenResponse,
  notFoundResponse,
  businessErrorResponse,
  ApiErrorCode
} from '@/lib/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/movimentacoes
 * 
 * Lista movimentaÃ§Ãµes com filtros e paginaÃ§Ã£o
 */
async function getHandler(request: NextRequest) {
  // 1. AUTENTICAÃ‡ÃƒO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÃ‡ÃƒO
  if (!user || !EstoquePermissions.VIEW.includes(user.papel as any)) {
    return forbiddenResponse('VocÃª nÃ£o tem permissÃ£o para visualizar movimentaÃ§Ãµes');
  }
  
  // 3. LOG
  logger.info('Listando movimentaÃ§Ãµes', createLogContext(request, user));
  
  // 4. PARÃ‚METROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request, 
    'criadoEm',
    ['id', 'tipo', 'quantidade', 'criadoEm']
  );
  const { filters } = getSearchParams(request);
  
  // 5. FILTROS CUSTOMIZADOS
  const whereFilters: any = {};
  
  // Filtro por tipo de movimentaÃ§Ã£o
  if (filters?.tipo) {
    whereFilters.tipo = filters.tipo;
  }
  
  // Filtro por material
  if (filters?.materialId) {
    whereFilters.materialId = Number(filters.materialId);
  }
  
  // Filtro por projeto
  if (filters?.projetoId) {
    whereFilters.projetoId = Number(filters.projetoId);
  }
  
  // Filtro por localizaÃ§Ã£o origem
  if (filters?.localizacaoOrigemId) {
    whereFilters.localizacaoOrigemId = Number(filters.localizacaoOrigemId);
  }
  
  // Filtro por localizaÃ§Ã£o destino
  if (filters?.localizacaoDestinoId) {
    whereFilters.localizacaoDestinoId = Number(filters.localizacaoDestinoId);
  }
  
  // Filtro por perÃ­odo
  if (filters?.dataInicio || filters?.dataFim) {
    whereFilters.criadoEm = {};
    if (filters.dataInicio) {
      whereFilters.criadoEm.gte = new Date(filters.dataInicio as string);
    }
    if (filters.dataFim) {
      whereFilters.criadoEm.lte = new Date(filters.dataFim as string);
    }
  }
  
  // 6. WHERE FINAL
  const where = mergeWhereConditions(whereFilters);
  
  // 7. CONSULTA PRINCIPAL
  const [movimentacoes, total] = await Promise.all([
    prisma.materialMovimentacao.findMany({
      where,
      skip,
      take,
      orderBy: createPrismaOrderBy({ orderBy, order }),
      include: {
        material: {
          select: { id: true, codigo: true, nome: true }
        },
        lote: {
          select: { id: true, codigoLote: true, dataValidade: true }
        },
        localizacaoOrigem: {
          select: { id: true, nome: true, codigo: true }
        },
        localizacaoDestino: {
          select: { id: true, nome: true, codigo: true }
        },
        projeto: {
          select: { id: true }
        },
        criador: {
          select: { id: true, nomeCompleto: true }
        }
      }
    }),
    prisma.materialMovimentacao.count({ where })
  ]);
  
  // 8. LOG SUCESSO
  logger.info(
    `MovimentaÃ§Ãµes listadas: ${total} total, pÃ¡gina ${page}/${Math.ceil(total / pageSize)}`,
    createLogContext(request, user)
  );
  
  // 9. RESPOSTA
  return paginatedResponse(movimentacoes, page, pageSize, total);
}

export const GET = withErrorHandler(getHandler);

/**
 * POST /api/estoque/movimentacoes
 * 
 * Cria uma nova movimentaÃ§Ã£o
 */
async function postHandler(request: NextRequest) {
  // 1. AUTENTICAÃ‡ÃƒO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÃ‡ÃƒO
  if (!user || !EstoquePermissions.MOVE.includes(user.papel as any)) {
    return forbiddenResponse('VocÃª nÃ£o tem permissÃ£o para criar movimentaÃ§Ãµes');
  }
  
  // 3. LOG
  logger.info('Criando movimentaÃ§Ã£o', createLogContext(request, user));
  
  // 4. VALIDAÃ‡ÃƒO DO BODY
  const body = await request.json();
  const { movimentacaoSchema } = await import('@gladpros/estoque/lib/validation');
  const validated = movimentacaoSchema.parse(body);
  
  // 5. VERIFICA SE MATERIAL EXISTE
  const material = await prisma.material.findUnique({
    where: { id: validated.materialId }
  });
  
  if (!material) {
    return notFoundResponse('Material');
  }
  
  // 6. VALIDAÃ‡Ã•ES ESPECÃFICAS POR TIPO
  if (validated.tipo === 'SAIDA' || validated.tipo === 'TRANSFERENCIA') {
    // Verifica saldo disponÃ­vel na localizaÃ§Ã£o origem
    if (!validated.localizacaoOrigemId) {
      return businessErrorResponse(
        'LocalizaÃ§Ã£o de origem Ã© obrigatÃ³ria para saÃ­da/transferÃªncia',
        ApiErrorCode.VALIDATION_ERROR
      );
    }
    
    const saldo = await prisma.materialSaldo.findFirst({
      where: {
        materialId: validated.materialId,
        localizacaoId: validated.localizacaoOrigemId,
        loteId: (validated.loteId || null) as any
      }
    });
    
    if (!saldo || Number(saldo.quantidade) < validated.quantidade) {
      return businessErrorResponse(
        'Saldo insuficiente na localizaÃ§Ã£o de origem',
        ApiErrorCode.INSUFFICIENT_STOCK,
        {
          saldoDisponivel: saldo ? Number(saldo.quantidade) : 0,
          quantidadeSolicitada: validated.quantidade
        }
      );
    }
  }
  
  // 7. CRIA MOVIMENTAÃ‡ÃƒO E ATUALIZA SALDOS
  const result = await prisma.$transaction(async (tx) => {
    // Cria movimentaÃ§Ã£o
    const movimentacao = await tx.materialMovimentacao.create({
      data: {
        ...validated,
        criadoPor: user.id
      },
      include: {
        material: {
          select: { id: true, codigo: true, nome: true }
        },
        localizacaoOrigem: {
          select: { id: true, nome: true }
        },
        localizacaoDestino: {
          select: { id: true, nome: true }
        },
        criador: {
          select: { id: true, nomeCompleto: true }
        }
      }
    });
    
    // Atualiza saldos conforme tipo de movimentaÃ§Ã£o
    if (validated.tipo === 'ENTRADA') {
      // Aumenta saldo no destino
      await tx.materialSaldo.upsert({
        where: {
          materialId_loteId_localizacaoId: {
            materialId: validated.materialId,
            localizacaoId: validated.localizacaoDestinoId!,
            loteId: (validated.loteId || null) as any
          }
        },
        create: {
          materialId: validated.materialId,
          localizacaoId: validated.localizacaoDestinoId!,
          loteId: validated.loteId,
          quantidade: validated.quantidade,
          reservado: 0
        },
        update: {
          quantidade: {
            increment: validated.quantidade
          }
        }
      });
    } else if (validated.tipo === 'SAIDA') {
      // Diminui saldo na origem
      await tx.materialSaldo.update({
        where: {
          materialId_loteId_localizacaoId: {
            materialId: validated.materialId,
            localizacaoId: validated.localizacaoOrigemId!,
            loteId: (validated.loteId || null) as any
          }
        },
        data: {
          quantidade: {
            decrement: validated.quantidade
          }
        }
      });
    } else if (validated.tipo === 'TRANSFERENCIA') {
      // Diminui na origem
      await tx.materialSaldo.update({
        where: {
          materialId_loteId_localizacaoId: {
            materialId: validated.materialId,
            localizacaoId: validated.localizacaoOrigemId!,
            loteId: (validated.loteId || null) as any
          }
        },
        data: {
          quantidade: {
            decrement: validated.quantidade
          }
        }
      });
      
      // Aumenta no destino
      await tx.materialSaldo.upsert({
        where: {
          materialId_loteId_localizacaoId: {
            materialId: validated.materialId,
            localizacaoId: validated.localizacaoDestinoId!,
            loteId: (validated.loteId || null) as any
          }
        },
        create: {
          materialId: validated.materialId,
          localizacaoId: validated.localizacaoDestinoId!,
          loteId: validated.loteId,
          quantidade: validated.quantidade,
          reservado: 0
        },
        update: {
          quantidade: {
            increment: validated.quantidade
          }
        }
      });
    }
    
    return movimentacao;
  });
  
  // 8. LOG SUCESSO
  logger.info(
    `MovimentaÃ§Ã£o criada: ${validated.tipo} - ${material.nome} (${validated.quantidade})`,
    createLogContext(request, user),
    { movimentacaoId: result.id, materialId: material.id }
  );
  
  // 9. RESPOSTA
  return successResponse(result, 'MovimentaÃ§Ã£o criada com sucesso', 201);
}

export const POST = withErrorHandler(postHandler);

