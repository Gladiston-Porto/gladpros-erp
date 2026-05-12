/**
 * API: SC — REJEITAR
 * PATCH /api/estoque/solicitacoes-compra/[id]/rejeitar
 * RBAC: FINANCEIRO, GERENTE, ADMIN apenas
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
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

const rejeitarSchema = z.object({
  motivoRejeicao: z.string().min(5, 'Informe o motivo da rejeição').max(1000),
});

async function patchHandler(request: NextRequest, { params }: Params) {
  const user = await requireUser(request);
  if (!can(user.role as Role, 'financeiro', 'read')) return forbiddenResponse();

  const { id } = await params;
  const scId = Number(id);

  const sc = await prisma.solicitacaoCompra.findUnique({ where: { id: scId } });
  if (!sc) return notFoundResponse('Solicitação de compra não encontrada');
  if (sc.status !== 'ENVIADA') {
    return validationErrorResponse([{ field: 'status', message: 'Apenas SCs ENVIADAS podem ser rejeitadas' }]);
  }

  const body = await request.json();
  const parsed = rejeitarSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })));
  }

  const updated = await prisma.solicitacaoCompra.update({
    where: { id: scId },
    data: {
      status: 'REJEITADA',
      aprovadorId: Number(user.id),
      motivoRejeicao: parsed.data.motivoRejeicao,
    },
  });

  logger.info('SC rejeitada', createLogContext(request, user), { scId });

  return successResponse({ solicitacaoCompra: updated }, 'Solicitação rejeitada');
}

export const PATCH = withErrorHandler(patchHandler);
