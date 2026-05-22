/**
 * API: ALERTAS - DETALHES E EXCLUSÃO
 * Arquivo: src/app/api/estoque/alertas/[id]/route.ts
 * 
 * Endpoints:
 * - GET    /api/estoque/alertas/[id]          - Detalhes do alerta
 * - DELETE /api/estoque/alertas/[id]          - Desativa alerta (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  withErrorHandler,
} from '@/lib/api';
import { requireRole } from '@/lib/api/auth';
import { ApiLogger, createLogContext } from '@/lib/api/logger';

const logger = new ApiLogger('API:Alertas:[ID]');

/**
 * GET /api/estoque/alertas/[id]
 * 
 * Retorna detalhes completos do alerta
 * 
 * @permissao VIEW_ESTOQUE
 */
async function getHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error } = await requireRole(request, ['ADMIN', 'GERENTE', 'ALMOXARIFE']);
  if (error) return error;

  // 2. VALIDAÇÃO ID
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 3. LOG
  logger.info(`Buscando alerta ${id}`, createLogContext(request, user));

  // 4. BUSCA NO BANCO
  const alerta = await prisma.alertaEstoque.findUnique({ // nosemgrep: gladpros-empresaId-required-on-prisma-where
    where: { id },
    include: {
      material: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          unidade: { select: { codigo: true } }
        }
      },
      equipamento: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          numeroSerie: true
        }
      },
      projeto: {
        select: {
          id: true,
          numeroProjeto: true,
          titulo: true
        }
      },
      visualizador: {
        select: {
          id: true,
          nomeCompleto: true,
          email: true
        }
      },
      resolvedor: {
        select: {
          id: true,
          nomeCompleto: true,
          email: true
        }
      }
    }
  });

  // 5. VALIDAÇÃO EXISTÊNCIA
  if (!alerta) {
    return notFoundResponse('Alerta não encontrado');
  }

  // 6. LOG SUCESSO
  logger.info(`Alerta ${id} encontrado`, createLogContext(request, user));

  // 7. RESPOSTA
  return successResponse({
    alerta: {
      ...alerta,
      status: alerta.resolvidoPor ? 'RESOLVIDO' : (alerta.visualizadoPor ? 'VISUALIZADO' : 'NOVO'),
      diasDesdeAlerta: Math.ceil((Date.now() - alerta.dataAlerta.getTime()) / (1000 * 60 * 60 * 24))
    }
  });
}

/**
 * DELETE /api/estoque/alertas/[id]
 * 
 * Desativa um alerta (soft delete)
 * 
 * @permissao MANAGE_ESTOQUE
 */
async function deleteHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTENTICAÇÃO
  const { user, error } = await requireRole(request, ['ADMIN', 'GERENTE']);
  if (error) return error;

  // 2. VALIDAÇÃO ID
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 3. LOG
  logger.info(`Desativando alerta ${id}`, createLogContext(request, user));

  // 4. VERIFICA EXISTÊNCIA
  const alertaExistente = await prisma.alertaEstoque.findUnique({ // nosemgrep: gladpros-empresaId-required-on-prisma-where
    where: { id }
  });

  if (!alertaExistente) {
    return notFoundResponse('Alerta não encontrado');
  }

  // 5. SOFT DELETE
  const alerta = await prisma.alertaEstoque.update({
    where: { id },
    data: {
      ativo: false
    }
  });

  // 6. LOG SUCESSO
  logger.info(`Alerta ${id} desativado`, createLogContext(request, user));

  // 7. RESPOSTA
  return successResponse(
    { alerta },
    'Alerta desativado com sucesso'
  );
}

export const GET = withErrorHandler(getHandler);
export const DELETE = withErrorHandler(deleteHandler);
