/**
 * API: ALERTAS - VISUALIZAR
 * Arquivo: src/app/api/estoque/alertas/[id]/visualizar/route.ts
 * 
 * Endpoint:
 * - PUT /api/estoque/alertas/[id]/visualizar - Marca alerta como visualizado
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  businessErrorResponse,
  withErrorHandler,
  logger,
  createLogContext,
  forbiddenResponse,
  ApiErrorCode
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

/**
 * PUT /api/estoque/alertas/[id]/visualizar
 * 
 * Marca alerta como visualizado
 * 
 * @permissao VIEW_ESTOQUE
 */
async function handler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const user = await requireUser(request);

  if (!can(user.role as Role, 'estoque', 'read')) {
    return forbiddenResponse('Você não tem permissão para visualizar alertas');
  }

  // 2. VALIDAÇÃO ID
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 3. LOG
  logger.info(`Marcando alerta ${id} como visualizado`, createLogContext(request, user));

  // 4. VERIFICA EXISTÊNCIA
  const alertaExistente = await prisma.alertaEstoque.findUnique({
    where: { id }
  });

  if (!alertaExistente) {
    return notFoundResponse('Alerta não encontrado');
  }

  // 5. VALIDAÇÃO: já visualizado?
  if (alertaExistente.visualizadoPor) {
    return businessErrorResponse(
      'Alerta já foi visualizado',
      ApiErrorCode.INVALID_STATE
    );
  }

  // 6. ATUALIZAÇÃO
  const alerta = await prisma.alertaEstoque.update({
    where: { id },
    data: {
      dataVisualizado: new Date(),
      visualizadoPor: Number(user.id)
    },
    include: {
      visualizador: {
        select: {
          id: true,
          nomeCompleto: true,
          email: true
        }
      }
    }
  });

  // 7. LOG SUCESSO
  logger.info(
    `Alerta ${id} visualizado por ${user.nome}`,
    createLogContext(request, user)
  );

  // 8. RESPOSTA
  return successResponse(
    { alerta },
    'Alerta marcado como visualizado'
  );
}

export const PUT = withErrorHandler(handler);
