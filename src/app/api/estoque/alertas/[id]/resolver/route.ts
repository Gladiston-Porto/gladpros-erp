/**
 * API: ALERTAS - RESOLVER
 * Arquivo: src/app/api/estoque/alertas/[id]/resolver/route.ts
 * 
 * Endpoint:
 * - PUT /api/estoque/alertas/[id]/resolver - Marca alerta como resolvido
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  notFoundResponse,
  businessErrorResponse,
  validationErrorResponse,
  withErrorHandler,
  logger,
  createLogContext,
  forbiddenResponse,
  ApiErrorCode
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

// SCHEMA DE VALIDAÇÃO
const resolverSchema = z.object({
  solucao: z.string().min(10, 'Descrição da solução deve ter pelo menos 10 caracteres').max(500)
});

/**
 * PUT /api/estoque/alertas/[id]/resolver
 * 
 * Marca alerta como resolvido com solução
 * 
 * @permissao MANAGE_ESTOQUE
 */
async function handler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const user = await requireUser(request);

  if (!can(user.role as Role, 'estoque', 'update')) {
    return forbiddenResponse('Você não tem permissão para resolver alertas');
  }

  // 3. VALIDAÇÃO ID
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  // 4. PARSE BODY
  const body = await request.json();

  // 5. VALIDAÇÃO ZOD
  const validation = resolverSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })));
  }

  const { solucao } = validation.data;

  // 6. LOG
  logger.info(`Resolvendo alerta ${id}`, createLogContext(request, user));

  // 7. VERIFICA EXISTÊNCIA
  const alertaExistente = await prisma.alertaEstoque.findUnique({
    where: { id }
  });

  if (!alertaExistente) {
    return notFoundResponse('Alerta não encontrado');
  }

  // 8. VALIDAÇÃO: já resolvido?
  if (alertaExistente.resolvidoPor) {
    return businessErrorResponse(
      'Alerta já foi resolvido',
      ApiErrorCode.INVALID_STATE
    );
  }

  // 9. ATUALIZAÇÃO
  const alerta = await prisma.alertaEstoque.update({
    where: { id },
    data: {
      dataResolvido: new Date(),
      resolvidoPor: Number(user.id),
      solucao,
      // Se não foi visualizado, marca como visualizado também
      ...(alertaExistente.visualizadoPor ? {} : {
        dataVisualizado: new Date(),
        visualizadoPor: Number(user.id)
      })
    },
    include: {
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

  // 10. LOG SUCESSO
  logger.info(
    `Alerta ${id} resolvido por ${user.nome}`,
    createLogContext(request, user)
  );

  // 11. RESPOSTA
  return successResponse(
    { alerta },
    'Alerta resolvido com sucesso'
  );
}

export const PUT = withErrorHandler(handler);
