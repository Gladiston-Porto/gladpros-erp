/**
 * PATCH /api/projetos/[id]/change-orders/[coId]/decision
 * Approve or reject a change order (internal ERP — not portal).
 *
 * Access: ADMIN, GERENTE only (canManageProject).
 * Business rules:
 *  - Only DRAFT or SENT change orders can be approved/rejected
 *  - Approval records approvedAt, approvedBy
 *  - Rejection requires a reason and records rejectedAt, rejectedBy
 *  - Approved COs can later be APPLIED (separate step, not here)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireProjectAccess, requireProjectPermission } from '@/shared/lib/rbac-projects';
import { withErrorHandler } from '@/lib/api/error-handler';
import { prisma } from '@/lib/prisma';

const DecisionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
  }),
  z.object({
    action: z.literal('reject'),
    reason: z.string().min(5, 'Informe o motivo da rejeição (mínimo 5 caracteres)').max(500),
  }),
]);

export const PATCH = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string; coId: string }> },
) => {
  const user = await requireProjectPermission(req, 'canCreate');

  const { id, coId } = await context.params;
  const projetoId = Number.parseInt(id, 10);
  const changeOrderId = Number.parseInt(coId, 10);

  if (Number.isNaN(projetoId) || Number.isNaN(changeOrderId)) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'IDs inválidos', success: false },
      { status: 400 },
    );
  }

  await requireProjectAccess(user, projetoId, 'canCreate');

  const body = DecisionSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: body.error.issues[0]?.message ?? 'Dados inválidos',
        success: false,
      },
      { status: 400 },
    );
  }

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { id: changeOrderId, projectId: projetoId, jobType: 'PROJECT' },
    select: { id: true, status: true, type: true },
  });

  if (!changeOrder) {
    return NextResponse.json(
      { error: 'Not found', message: 'Change Order não encontrado', success: false },
      { status: 404 },
    );
  }

  if (changeOrder.status !== 'DRAFT' && changeOrder.status !== 'SENT') {
    return NextResponse.json(
      {
        error: 'Business rule violation',
        message: `Change Order com status '${changeOrder.status}' não pode ser aprovado ou rejeitado`,
        success: false,
      },
      { status: 422 },
    );
  }

  const now = new Date();
  const { action } = body.data;

  const updated = await prisma.changeOrder.update({
    where: { id: changeOrderId },
    data:
      action === 'approve'
        ? {
            status: 'APPROVED',
            approvedAt: now,
            approvedBy: Number(user.id),
            approvedByName: user.email,
          }
        : {
            status: 'REJECTED',
            rejectedAt: now,
            rejectedBy: Number(user.id),
            rejectedByName: user.email,
            rejectedReason: body.data.reason,
          },
    include: {
      items: true,
      createdByUser: { select: { id: true, nomeCompleto: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: Number(user.id),
      entidade: 'ChangeOrder',
      entidadeId: String(changeOrderId),
      acao: action === 'approve' ? 'APPROVE' : 'REJECT',
      diff: JSON.stringify({
        projetoId,
        previousStatus: changeOrder.status,
        newStatus: updated.status,
        ...(action === 'reject' ? { reason: body.data.reason } : {}),
      }),
    },
  });

  return NextResponse.json({ data: updated, success: true });
});
