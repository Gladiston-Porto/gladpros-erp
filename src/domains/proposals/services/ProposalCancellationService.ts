import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { StatusPropostaValues } from '@/shared/types/propostas';
import type { AuditContext, ProposalOperationResult } from '../types';

export async function cancelProposal(
  propostaId: number,
  motivo: string | undefined,
  audit: AuditContext
): Promise<ProposalOperationResult> {
  const proposta = await prisma.proposta.findFirst({
    where: {
      id: propostaId,
      deletedAt: null,
      status: { in: [StatusPropostaValues.RASCUNHO, StatusPropostaValues.ENVIADA, StatusPropostaValues.ASSINADA] },
    },
  });

  if (!proposta) {
    return { success: false, error: 'Proposta não encontrada ou não pode ser cancelada' };
  }

  if (proposta.projetoId) {
    return {
      success: false,
      error: 'Proposta já vinculada a projeto. Cancele ou reverta o projeto antes de cancelar a proposta.',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await prisma.$transaction(async (tx: any) => {
    const result = await tx.proposta.update({
      where: { id: propostaId },
      data: {
        status: StatusPropostaValues.CANCELADA,
        motivo_cancelamento: motivo || 'Cancelado pelo usuário',
        atualizadoEm: new Date(),
      },
    });

    await tx.propostaLog.create({
      data: {
        id: randomUUID(),
        propostaId,
        actorId: Number(audit.actorId),
        action: 'CANCELLED',
        newJson: JSON.stringify({ status: 'CANCELADA', motivo }),
        ip: audit.ip,
        userAgent: audit.userAgent,
      },
    });

    return result;
  });

  return { success: true, data: updated };
}
