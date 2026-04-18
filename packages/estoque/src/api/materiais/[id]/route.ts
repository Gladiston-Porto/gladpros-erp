/**
 * /api/estoque/materiais/[id]
 * 
 * Endpoints para material específico (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  withErrorHandler,
  requireAuth,
  EstoquePermissions,
  logger,
  createLogContext,
  forbiddenResponse,
  conflictResponse
} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/materiais/[id]
 * 
 * Obtém detalhes de um material
 */
async function getHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.VIEW.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para visualizar materiais');
  }
  
  // 3. LOG
  logger.info(`Buscando material ${params.id}`, createLogContext(request, user));
  
  // 4. BUSCA MATERIAL
  const material = await prisma.material.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      unidade: true,
      categoria: true,
      criador: {
        select: { id: true, nomeCompleto: true, email: true }
      },
      atualizador: {
        select: { id: true, nomeCompleto: true, email: true }
      },
      lotes: {
        orderBy: { dataValidade: 'asc' },
        take: 10
      },
      saldos: {
        include: {
          localizacao: true
        },
        orderBy: { quantidade: 'desc' }
      },
      _count: {
        select: {
          movimentacoes: true,
          lotes: true
        }
      }
    }
  });
  
  if (!material) {
    return notFoundResponse('Material');
  }
  
  // 5. CALCULA SALDO TOTAL
  const saldoTotal = material.saldos.reduce((acc: number, s: any) => acc + Number(s.quantidade), 0);
  
  // 6. BUSCA ÚLTIMAS MOVIMENTAÇÕES
  const ultimasMovimentacoes = await prisma.materialMovimentacao.findMany({
    where: { materialId: material.id },
    orderBy: { criadoEm: 'desc' },
    take: 10,
    include: {
      localizacaoOrigem: true,
      localizacaoDestino: true,
      criador: {
        select: { id: true, nomeCompleto: true }
      },
      projeto: {
        select: { id: true }
      }
    }
  });
  
  // 7. LOG SUCESSO
  logger.info(
    `Material encontrado: ${material.nome}`,
    createLogContext(request, user),
    { materialId: material.id }
  );
  
  // 8. RESPOSTA
  return successResponse({
    ...material,
    saldoTotal,
    abaixoMinimo: saldoTotal < Number(material.estoqueMinimo),
    ultimasMovimentacoes
  });
}

export const GET = withErrorHandler(getHandler);

/**
 * PUT /api/estoque/materiais/[id]
 * 
 * Atualiza um material
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.MANAGE.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para editar materiais');
  }
  
  // 3. LOG
  logger.info(`Atualizando material ${params.id}`, createLogContext(request, user));
  
  // 4. VERIFICA SE EXISTE
  const exists = await prisma.material.findUnique({
    where: { id: parseInt(params.id) }
  });
  
  if (!exists) {
    return notFoundResponse('Material');
  }
  
  // 5. VALIDAÇÃO DO BODY
  const body = await request.json();
  const { materialSchema } = await import('@/lib/estoque/validation');
  const validated = materialSchema.partial().parse(body);
  
  // 6. VERIFICA DUPLICAÇÃO DE CÓDIGO
  if (validated.codigo && validated.codigo !== exists.codigo) {
    const duplicate = await prisma.material.findFirst({
      where: { 
        codigo: validated.codigo,
        id: { not: exists.id }
      }
    });
    
    if (duplicate) {
      return conflictResponse('Já existe um material com este código');
    }
  }
  
  // 7. ATUALIZA MATERIAL
  const material = await prisma.material.update({
    where: { id: exists.id },
    data: {
      ...validated,
      atualizadoPor: user.id
    },
    include: {
      unidade: true,
      categoria: true,
      criador: {
        select: { id: true, nomeCompleto: true, email: true }
      },
      atualizador: {
        select: { id: true, nomeCompleto: true, email: true }
      }
    }
  });
  
  // 8. LOG SUCESSO
  logger.info(
    `Material atualizado: ${material.nome} (ID: ${material.id})`,
    createLogContext(request, user),
    { materialId: material.id, changes: validated }
  );
  
  // 9. RESPOSTA
  return successResponse(material, 'Material atualizado com sucesso');
}

export const PUT = withErrorHandler(putHandler);

/**
 * DELETE /api/estoque/materiais/[id]
 * 
 * Exclui (soft delete) um material
 */
async function deleteHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;
  
  // 2. AUTORIZAÇÃO
  if (!user || !EstoquePermissions.DELETE.includes(user.papel as any)) {
    return forbiddenResponse('Você não tem permissão para excluir materiais');
  }
  
  // 3. LOG
  logger.info(`Excluindo material ${params.id}`, createLogContext(request, user));
  
  // 4. VERIFICA SE EXISTE
  const material = await prisma.material.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      _count: {
        select: {
          movimentacoes: true,
          saldos: true,
          lotes: true
        }
      }
    }
  });
  
  if (!material) {
    return notFoundResponse('Material');
  }
  
  // 5. VERIFICA SE TEM SALDO
  const saldoTotal = await prisma.materialSaldo.aggregate({
    where: { materialId: material.id },
    _sum: { quantidade: true }
  });
  
  if (Number(saldoTotal._sum.quantidade || 0) > 0) {
    const { businessErrorResponse, ApiErrorCode } = await import('@/lib/api');
    return businessErrorResponse(
      'Não é possível excluir material com saldo em estoque',
      ApiErrorCode.VALIDATION_ERROR,
      { saldoAtual: saldoTotal._sum.quantidade }
    );
  }
  
  // 6. SOFT DELETE
  const deleted = await prisma.material.update({
    where: { id: material.id },
    data: {
      ativo: false,
      atualizadoPor: user.id
    }
  });
  
  // 7. LOG SUCESSO
  logger.info(
    `Material excluído: ${deleted.nome} (ID: ${deleted.id})`,
    createLogContext(request, user),
    { materialId: deleted.id }
  );
  
  // 8. RESPOSTA
  return successResponse(deleted, 'Material excluído com sucesso');
}

export const DELETE = withErrorHandler(deleteHandler);
