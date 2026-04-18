/**
 * /api/estoque/equipamentos/[id]
 * 
 * Endpoints para equipamento específico (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  withErrorHandler,
  logger,
  createLogContext,
  forbiddenResponse,
  conflictResponse,
  businessErrorResponse,
  ApiErrorCode
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/estoque/equipamentos/[id]
 * 
 * Obtém detalhes de um equipamento
 */
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser(request);

  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar equipamentos');
  }

  // 3. LOG
  logger.info(`Buscando equipamento ${id}`, createLogContext(request, user));

  // 4. BUSCA EQUIPAMENTO
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: parseInt(id) },
    include: {
      categoria: true,
      fornecedor: {
        select: { id: true, nome: true, telefone: true, email: true }
      },
      projetoAtual: {
        select: { id: true }
      },
      criador: {
        select: { id: true, nomeCompleto: true, email: true }
      },
      atualizador: {
        select: { id: true, nomeCompleto: true, email: true }
      },
      _count: {
        select: {
          projetoEquipamentos: true,
          manutencoes: true
        }
      }
    }
  });

  if (!equipamento) {
    return notFoundResponse('Equipamento');
  }

  // 5. BUSCA HISTÓRICO DE ALOCAÇÕES
  const historicoAlocacoes = await prisma.projetoEquipamento.findMany({
    where: { equipamentoId: equipamento.id },
    orderBy: { dataAlocacao: 'desc' },
    take: 10,
    include: {
      projeto: {
        select: { id: true }
      },
      criador: {
        select: { id: true, nomeCompleto: true }
      }
    }
  });

  // 6. BUSCA HISTÓRICO DE MANUTENÇÕES
  const historicoManutencoes = await prisma.equipamentoManutencao.findMany({
    where: { equipamentoId: equipamento.id },
    orderBy: { dataInicio: 'desc' },
    take: 10,
    include: {
      criador: {
        select: { id: true, nomeCompleto: true }
      }
    }
  });

  // 7. CALCULA DEPRECIAÇÃO ATUAL (se tiver valor e data de aquisição)
  let depreciacaoInfo = null;
  if (equipamento.valorAquisicao && equipamento.dataAquisicao) {
    const mesesUso = Math.floor(
      (new Date().getTime() - new Date(equipamento.dataAquisicao).getTime()) /
      (1000 * 60 * 60 * 24 * 30)
    );

    const vidaUtilMeses = 60; // Default 5 anos
    const valorAquisicao = Number(equipamento.valorAquisicao);
    const taxaDepreciacao = valorAquisicao / vidaUtilMeses;
    const depreciacaoAcumulada = Math.min(taxaDepreciacao * mesesUso, valorAquisicao);
    const valorAtual = valorAquisicao - depreciacaoAcumulada;

    depreciacaoInfo = {
      valorAquisicao,
      vidaUtilMeses,
      mesesUso,
      depreciacaoAcumulada,
      valorAtual,
      percentualDepreciado: (depreciacaoAcumulada / valorAquisicao) * 100
    };
  }

  // 8. LOG SUCESSO
  logger.info(
    `Equipamento encontrado: ${equipamento.nome}`,
    createLogContext(request, user),
    { equipamentoId: equipamento.id }
  );

  // 9. RESPOSTA
  return successResponse({
    ...equipamento,
    emUso: equipamento.status === 'EM_USO',
    precisaManutencao: equipamento.status === 'EM_MANUTENCAO' ||
      (equipamento.proximaManutencao && new Date(equipamento.proximaManutencao) < new Date()),
    precisaCalibracao: equipamento.status === 'CALIBRACAO' ||
      (equipamento.proximaCalibracao && new Date(equipamento.proximaCalibracao) < new Date()),
    depreciacaoInfo,
    historicoAlocacoes,
    historicoManutencoes
  });
}

export const GET = withErrorHandler(getHandler);

/**
 * PUT /api/estoque/equipamentos/[id]
 * 
 * Atualiza um equipamento
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser(request);

  if (!can(user.role as Role, 'estoque', 'update')) {
    return forbiddenResponse('Você não tem permissão para editar equipamentos');
  }

  // 3. LOG
  logger.info(`Atualizando equipamento ${id}`, createLogContext(request, user));

  // 4. VERIFICA SE EXISTE
  const exists = await prisma.equipamento.findUnique({
    where: { id: parseInt(id) }
  });

  if (!exists) {
    return notFoundResponse('Equipamento');
  }

  // 5. VALIDAÇÃO DO BODY
  const body = await request.json();
  const { equipamentoSchema } = await import('@/lib/estoque/validation');
  const validated = equipamentoSchema.partial().parse(body);

  // 6. VERIFICA DUPLICAÇÃO DE CÓDIGO
  if (validated.codigo && validated.codigo !== exists.codigo) {
    const duplicate = await prisma.equipamento.findFirst({
      where: {
        codigo: validated.codigo,
        id: { not: exists.id }
      }
    });

    if (duplicate) {
      return conflictResponse('Já existe um equipamento com este código');
    }
  }

  // 7. VERIFICA DUPLICAÇÃO DE NÚMERO DE SÉRIE
  if (validated.numeroSerie && validated.numeroSerie !== exists.numeroSerie) {
    const duplicate = await prisma.equipamento.findFirst({
      where: {
        numeroSerie: validated.numeroSerie,
        id: { not: exists.id }
      }
    });

    if (duplicate) {
      return conflictResponse('Já existe um equipamento com este número de série');
    }
  }

  // 8. ATUALIZA EQUIPAMENTO
  const equipamento = await prisma.equipamento.update({
    where: { id: exists.id },
    data: {
      ...validated,
      atualizadoPor: Number(user.id)
    },
    include: {
      categoria: true,
      fornecedor: {
        select: { id: true, nome: true }
      },
      projetoAtual: {
        select: { id: true }
      },
      criador: {
        select: { id: true, nomeCompleto: true, email: true }
      },
      atualizador: {
        select: { id: true, nomeCompleto: true, email: true }
      }
    }
  });

  // 9. LOG SUCESSO
  logger.info(
    `Equipamento atualizado: ${equipamento.nome} (ID: ${equipamento.id})`,
    createLogContext(request, user),
    { equipamentoId: equipamento.id, changes: validated }
  );

  // 10. RESPOSTA
  return successResponse(equipamento, 'Equipamento atualizado com sucesso');
}

export const PUT = withErrorHandler(putHandler);

/**
 * DELETE /api/estoque/equipamentos/[id]
 * 
 * Exclui (soft delete) um equipamento
 */
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser(request);

  if (!can(user.role as Role, 'estoque', 'delete')) {
    return forbiddenResponse('Você não tem permissão para excluir equipamentos');
  }

  // 3. LOG
  logger.info(`Excluindo equipamento ${id}`, createLogContext(request, user));

  // 4. VERIFICA SE EXISTE
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: parseInt(id) },
    include: {
      projetoAtual: true,
      _count: {
        select: {
          projetoEquipamentos: true,
          manutencoes: true
        }
      }
    }
  });

  if (!equipamento) {
    return notFoundResponse('Equipamento');
  }

  // 5. VERIFICA SE ESTÁ EM USO
  if (equipamento.status === 'EM_USO') {
    return businessErrorResponse(
      'Não é possível excluir equipamento em uso. Devolva o equipamento primeiro.',
      ApiErrorCode.EQUIPMENT_IN_USE,
      { status: equipamento.status, projetoId: equipamento.projetoAtualId }
    );
  }

  // 6. VERIFICA SE ESTÁ EM MANUTENÇÃO
  if (equipamento.status === 'EM_MANUTENCAO') {
    return businessErrorResponse(
      'Não é possível excluir equipamento em manutenção',
      ApiErrorCode.EQUIPMENT_IN_USE,
      { status: equipamento.status }
    );
  }

  // 7. SOFT DELETE
  const deleted = await prisma.equipamento.update({
    where: { id: equipamento.id },
    data: {
      ativo: false,
      atualizadoPor: Number(user.id)
    }
  });

  // 8. LOG SUCESSO
  logger.info(
    `Equipamento excluído: ${deleted.nome} (ID: ${deleted.id})`,
    createLogContext(request, user),
    { equipamentoId: deleted.id }
  );

  // 9. RESPOSTA
  return successResponse(deleted, 'Equipamento excluído com sucesso');
}

export const DELETE = withErrorHandler(deleteHandler);
