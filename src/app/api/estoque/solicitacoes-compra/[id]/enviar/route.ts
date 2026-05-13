/**
 * API: SC — ENVIAR para aprovação
 * PATCH /api/estoque/solicitacoes-compra/[id]/enviar
 * RBAC: ESTOQUE, GERENTE, ADMIN (solicitante ou GERENTE+)
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
    include: { itens: true },
  });

  if (!sc) return notFoundResponse('Solicitação de compra não encontrada');
  if (sc.status !== 'RASCUNHO') {
    return validationErrorResponse([{ field: 'status', message: 'Apenas SCs em RASCUNHO podem ser enviadas' }]);
  }
  if (sc.itens.length === 0) {
    return validationErrorResponse([{ field: 'itens', message: 'Adicione pelo menos 1 item antes de enviar' }]);
  }

  // Só o solicitante (ou GERENTE+) pode enviar
  if (sc.solicitanteId !== Number(user.id) && !can(user.role as Role, 'financeiro', 'read')) {
    return forbiddenResponse();
  }

  const updated = await prisma.solicitacaoCompra.update({
    where: { id: scId },
    data: { status: 'ENVIADA', enviadaEm: new Date() },
  });

  logger.info('SC enviada para aprovação', createLogContext(request, user), { scId });

  // TODO (Fase 6 final): criar notificação in-app para FINANCEIRO/GERENTE
  return successResponse({ solicitacaoCompra: updated }, 'Solicitação enviada para aprovação');
}

export const PATCH = withErrorHandler(patchHandler);
