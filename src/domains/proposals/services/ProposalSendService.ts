import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { StatusPropostaValues } from '@/shared/types/propostas';
import { EmailService } from '@/shared/lib/email';
import type { AuditContext, ProposalOperationResult } from '../types';

export async function sendProposal(
  propostaId: number,
  audit: AuditContext
): Promise<ProposalOperationResult> {
  const proposta = await prisma.proposta.findFirst({
    where: {
      id: propostaId,
      deletedAt: null,
      status: StatusPropostaValues.RASCUNHO,
    },
    include: { Cliente: { select: { email: true, nomeCompleto: true, nomeFantasia: true } } },
  });

  if (!proposta) {
    return { success: false, error: 'Proposta não encontrada ou não pode ser enviada' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await prisma.$transaction(async (tx: any) => {
    const result = await tx.proposta.update({
      where: { id: propostaId },
      data: {
        status: StatusPropostaValues.ENVIADA,
        enviadaParaOCliente: new Date(),
        atualizadoEm: new Date(),
      },
    });

    await tx.propostaLog.create({
      data: {
        id: randomUUID(),
        propostaId,
        actorId: Number(audit.actorId),
        action: 'SENT',
        newJson: JSON.stringify({ status: 'ENVIADA' }),
        ip: audit.ip,
        userAgent: audit.userAgent,
      },
    });

    return result;
  });

  // Send email notification (best-effort, don't fail the operation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = (proposta as any).Cliente;
  if (cliente?.email) {
    await EmailService.sendProposalNotification({
      to: cliente.email,
      clientName: cliente.nomeCompleto || cliente.nomeFantasia || 'Cliente',
      proposalNumber: proposta.numeroProposta,
      proposalTitle: proposta.titulo,
      proposalValue: proposta.valorEstimado ? Number(proposta.valorEstimado) : null,
      currency: proposta.moeda || 'USD',
    }).catch((err) => console.error('[ProposalSendService] Erro ao enviar email:', err));
  }

  return { success: true, data: updated };
}
