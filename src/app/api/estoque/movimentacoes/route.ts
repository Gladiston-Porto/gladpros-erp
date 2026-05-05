/**
 * /api/estoque/movimentacoes
 * 
 * Endpoints para movimentações de estoque
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
  mergeWhereConditions,
  logger,
  createLogContext,
  forbiddenResponse,
  notFoundResponse,
  businessErrorResponse,
  ApiErrorCode
} from '@/lib/api';
import { z } from 'zod';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/movimentacoes
 * 
 * Lista movimentações com filtros e paginação
 */
async function getHandler(request: NextRequest) {
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar movimentações');
  }
  
  // 3. LOG
  logger.info('Listando movimentações', createLogContext(request, user));
  
  // 4. PARÂMETROS
  const { skip, take, page, pageSize } = getPaginationParams(request, 20, 100);
  const { orderBy, order } = getSortParams(
    request, 
    'criadoEm',
    ['id', 'tipo', 'quantidade', 'criadoEm']
  );
  const { filters } = getSearchParams(request);
  
  // 5. FILTROS CUSTOMIZADOS
  const whereFilters: any = {};
  
  // Filtro por tipo de movimentação
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
  
  // Filtro por localização origem
  if (filters?.localizacaoOrigemId) {
    whereFilters.localizacaoOrigemId = Number(filters.localizacaoOrigemId);
  }
  
  // Filtro por localização destino
  if (filters?.localizacaoDestinoId) {
    whereFilters.localizacaoDestinoId = Number(filters.localizacaoDestinoId);
  }
  
  // Filtro por período
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
    `Movimentações listadas: ${total} total, página ${page}/${Math.ceil(total / pageSize)}`,
    createLogContext(request, user)
  );
  
  // 9. RESPOSTA
  return paginatedResponse(movimentacoes, page, pageSize, total);
}

export const GET = withErrorHandler(getHandler);

/**
 * POST /api/estoque/movimentacoes
 * 
 * Cria uma nova movimentação
 */
async function postHandler(request: NextRequest) {
  const user = await requireUser(request);
  
  if (!can(user.role as Role, 'estoque', 'update')) {
    return forbiddenResponse('Você não tem permissão para criar movimentações');
  }
  
  // 3. LOG
  logger.info('Criando movimentação', createLogContext(request, user));
  
  // 4. VALIDAÇÃO DO BODY
  const body = await request.json();
  const { movimentacaoSchema } = await import('@/lib/estoque/validation');
  const validated = movimentacaoSchema.parse(body);
  
  // 5. VERIFICA SE MATERIAL EXISTE
  const material = await prisma.material.findUnique({
    where: { id: validated.materialId }
  });
  
  if (!material) {
    return notFoundResponse('Material');
  }
  
  // 6. VALIDAÇÕES ESPECÍFICAS POR TIPO
  if (validated.tipo === 'SAIDA' || validated.tipo === 'TRANSFERENCIA' || validated.tipo === 'AJUSTE_NEGATIVO' || validated.tipo === 'PERDA') {
    // Verifica saldo disponível na localização origem
    if (!validated.localizacaoOrigemId) {
      return businessErrorResponse(
        'Localização de origem é obrigatória para saída/transferência/ajuste negativo/perda',
        ApiErrorCode.VALIDATION_ERROR
      );
    }
    
    const saldo = await prisma.materialSaldo.findFirst({
      where: {
        materialId: validated.materialId,
        localizacaoId: validated.localizacaoOrigemId,
        loteId: validated.loteId || null
      }
    });
    
    if (!saldo || Number(saldo.quantidade) < validated.quantidade) {
      return businessErrorResponse(
        'Saldo insuficiente na localização de origem',
        ApiErrorCode.INSUFFICIENT_STOCK,
        {
          saldoDisponivel: saldo ? Number(saldo.quantidade) : 0,
          quantidadeSolicitada: validated.quantidade
        }
      );
    }
  }

  // DEVOLUCAO: localização destino é obrigatória (onde o material está sendo devolvido)
  if (validated.tipo === 'DEVOLUCAO' && !validated.localizacaoDestinoId) {
    return businessErrorResponse(
      'Localização de destino é obrigatória para devolução',
      ApiErrorCode.VALIDATION_ERROR
    );
  }

  // AJUSTE_POSITIVO: localização destino é obrigatória
  if (validated.tipo === 'AJUSTE_POSITIVO' && !validated.localizacaoDestinoId) {
    return businessErrorResponse(
      'Localização de destino é obrigatória para ajuste positivo',
      ApiErrorCode.VALIDATION_ERROR
    );
  }
  
  // 7. CRIA MOVIMENTAÇÃO E ATUALIZA SALDOS
  const result = await prisma.$transaction(async (tx) => {
    // Cria movimentação
    const movimentacao = await tx.materialMovimentacao.create({
      data: {
        ...validated,
        criadoPor: Number(user.id)
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
    
    // Atualiza saldos conforme tipo de movimentação
    if (validated.tipo === 'ENTRADA' || validated.tipo === 'DEVOLUCAO' || validated.tipo === 'AJUSTE_POSITIVO') {
      // Aumenta saldo no destino
      await tx.materialSaldo.upsert({
        where: {
          materialId_loteId_localizacaoId: {
            materialId: validated.materialId,
            localizacaoId: validated.localizacaoDestinoId!,
            loteId: validated.loteId ?? 0
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
    } else if (validated.tipo === 'SAIDA' || validated.tipo === 'AJUSTE_NEGATIVO' || validated.tipo === 'PERDA') {
      // Diminui saldo na origem
      await tx.materialSaldo.update({
        where: {
          materialId_loteId_localizacaoId: {
            materialId: validated.materialId,
            localizacaoId: validated.localizacaoOrigemId!,
            loteId: validated.loteId ?? 0
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
            loteId: validated.loteId ?? 0
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
            loteId: validated.loteId ?? 0
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
    `Movimentação criada: ${validated.tipo} - ${material.nome} (${validated.quantidade})`,
    createLogContext(request, user),
    { movimentacaoId: result.id, materialId: material.id }
  );
  
  // 9. RESPOSTA
  return successResponse(result, 'Movimentação criada com sucesso', 201);
}

export const POST = withErrorHandler(postHandler);
