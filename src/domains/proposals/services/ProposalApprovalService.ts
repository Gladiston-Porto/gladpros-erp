import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { eventBus } from '@/server/events/event-bus';
import type { AuditContext, ProposalOperationResult } from '../types';

export async function approveProposal(
  propostaId: number,
  audit: AuditContext
): Promise<ProposalOperationResult> {
  const proposta = await prisma.proposta.findFirst({
    where: { id: propostaId, deletedAt: null, status: 'ASSINADA' },
  });

  if (!proposta) {
    return { success: false, error: 'Proposta não encontrada ou não está assinada' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await prisma.$transaction(async (tx: any) => {
    const result = await tx.proposta.update({
      where: { id: propostaId },
      data: {
        status: 'APROVADA',
        atualizadoEm: new Date(),
        atualizadoPor: Number(audit.actorId),
      },
    });

    await tx.propostaLog.create({
      data: {
        id: randomUUID(),
        propostaId,
        actorId: Number(audit.actorId),
        action: 'APPROVED',
        newJson: JSON.stringify({ status: 'APROVADA' }),
        ip: audit.ip,
        userAgent: audit.userAgent,
      },
    });

    return result;
  });

  await eventBus.emit({
    name: 'proposal.approved',
    aggregateType: 'proposal',
    aggregateId: String(propostaId),
    payload: {
      propostaId,
      clienteId: updated.clienteId,
      valorEstimado: updated.valorEstimado ? Number(updated.valorEstimado) : null,
      approvedBy: Number(audit.actorId),
    },
  });

  return { success: true, data: updated };
}
