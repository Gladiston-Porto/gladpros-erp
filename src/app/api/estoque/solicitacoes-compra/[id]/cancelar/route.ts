/**
 * API: SC — CANCELAR
 * PATCH /api/estoque/solicitacoes-compra/[id]/cancelar
 * RBAC: ESTOQUE (própria), GERENTE, ADMIN
 * Bloqueado: não pode cancelar SC APROVADA se já tiver Compras vinculadas
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  validationErrorResponse,
  withErrorHandler,
  notFoundResponse,
  forbiddenResponse,
  logger,
  createLogContext,
} from '@/lib/api';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function patchHandler(request: NextRequest, { params }: Params) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'estoque', 'update')) return forbiddenResponse();

  const { id } = await params;
  const scId = Number(id);

  const sc = await prisma.solicitacaoCompra.findUnique({
    where: { id: scId },
    include: { _count: { select: { compras: true } } },
  });

  if (!sc) return notFoundResponse('Solicitação de compra não encontrada');

  // Só cancelável nos estados: RASCUNHO, ENVIADA, APROVADA (sem compras)
  const cancelableStatuses = ['RASCUNHO', 'ENVIADA', 'APROVADA'];
  if (!cancelableStatuses.includes(sc.status)) {
    return validationErrorResponse([{ field: 'status', message: `SC com status ${sc.status} não pode ser cancelada` }]);
  }

  // SC APROVADA com compras vinculadas não pode ser cancelada
  if (sc.status === 'APROVADA' && sc._count.compras > 0) {
    return validationErrorResponse([{
      field: 'compras',
      message: 'SC com compras vinculadas não pode ser cancelada. Cancele as compras antes.',
    }]);
  }

  // ESTOQUE só cancela própria SC (exceto GERENTE+)
  if (sc.solicitanteId !== Number(user.id) && !can(user.role as Role, 'financeiro', 'read')) {
    return forbiddenResponse();
  }

  const updated = await prisma.solicitacaoCompra.update({
    where: { id: scId },
    data: { status: 'CANCELADA' },
  });

  logger.info('SC cancelada', createLogContext(request, user), { scId });

  return successResponse({ solicitacaoCompra: updated }, 'Solicitação cancelada');
}

export const PATCH = withErrorHandler(patchHandler);
