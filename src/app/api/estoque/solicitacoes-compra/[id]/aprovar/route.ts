/**
 * API: SC — APROVAR
 * PATCH /api/estoque/solicitacoes-compra/[id]/aprovar
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

const aprovarSchema = z.object({
  valorAprovado: z.number().positive('Valor aprovado é obrigatório'),
  observacoes: z.string().max(500).optional(),
});

async function patchHandler(request: NextRequest, { params }: Params) {
  const user = await requireUser(request);
  // Apenas FINANCEIRO, GERENTE ou ADMIN podem aprovar
  if (!can(user.role as Role, 'financeiro', 'read')) return forbiddenResponse();

  const { id } = await params;
  const scId = Number(id);

  const sc = await prisma.solicitacaoCompra.findUnique({ where: { id: scId } });
  if (!sc) return notFoundResponse('Solicitação de compra não encontrada');
  if (sc.status !== 'ENVIADA') {
    return validationErrorResponse([{ field: 'status', message: 'Apenas SCs ENVIADAS podem ser aprovadas' }]);
  }

  const body = await request.json();
  const parsed = aprovarSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })));
  }

  const updated = await prisma.solicitacaoCompra.update({
    where: { id: scId },
    data: {
      status: 'APROVADA',
      aprovadorId: Number(user.id),
      valorAprovado: parsed.data.valorAprovado,
      aprovadaEm: new Date(),
      ...(parsed.data.observacoes ? { observacoes: parsed.data.observacoes } : {}),
    },
  });

  logger.info('SC aprovada', createLogContext(request, user), { scId, valorAprovado: parsed.data.valorAprovado });

  return successResponse({ solicitacaoCompra: updated }, `Solicitação aprovada com budget de $${parsed.data.valorAprovado.toFixed(2)}`);
}

export const PATCH = withErrorHandler(patchHandler);
