import { PlaybookStep, PlaybookContext } from './types';
import { prisma } from '@/lib/prisma';
import { ProjectProposalConversionService } from '@/domains/projects/services/ProjectProposalConversionService';
import { eventBus } from '@/server/events/event-bus';

interface ProposalApprovedContext extends PlaybookContext {
  propostaId: number;
  approvedBy: number;
  // Populated by steps along the way
  projetoId?: number;
  invoiceId?: number;
}

function createProposalApprovedSteps(ctx: ProposalApprovedContext): PlaybookStep[] {
  return [
    {
      name: 'validate-proposal',
      async run() {
        const proposta = await prisma.proposta.findFirst({
          where: { id: ctx.propostaId, deletedAt: null, status: 'APROVADA' },
        });
        if (!proposta) {
          throw new Error(`Proposta ${ctx.propostaId} não encontrada ou não está aprovada`);
        }
        if (proposta.projetoId) {
          throw new Error(`Proposta ${ctx.propostaId} já foi convertida em projeto ${proposta.projetoId}`);
        }
      },
    },
    {
      name: 'convert-to-project',
      async run() {
        const service = new ProjectProposalConversionService();
        const projeto = await service.convertFromProposal(ctx.propostaId, ctx.approvedBy);
        ctx.projetoId = projeto.id;
      },
    },
    {
      name: 'emit-project-created',
      async run() {
        if (!ctx.projetoId) return;
        await eventBus.emit({
          name: 'project.created',
          aggregateType: 'project',
          aggregateId: String(ctx.projetoId),
          payload: {
            projetoId: ctx.projetoId,
            fromPropostaId: ctx.propostaId,
            createdBy: ctx.approvedBy,
          },
        }, { correlationId: ctx.correlationId });
      },
    },
    {
      name: 'create-initial-invoice',
      async run() {
        if (!ctx.projetoId) return;

        const proposta = await prisma.proposta.findUnique({
          where: { id: ctx.propostaId },
          select: { gatilhoFaturamento: true, percentualSinal: true, valorEstimado: true },
        });

        // Only create invoice if trigger is on approval
        if (proposta?.gatilhoFaturamento !== 'NA_APROVACAO') return;

        const percentual = proposta.percentualSinal ? Number(proposta.percentualSinal) : 100;
        const valorBase = proposta.valorEstimado ? Number(proposta.valorEstimado) : 0;
        const valorInvoice = (valorBase * percentual) / 100;

        if (valorInvoice <= 0) return;

        const notas = percentual < 100
              ? `Sinal de ${percentual}% - Proposta ${ctx.propostaId}`
              : `Faturamento integral - Proposta ${ctx.propostaId}`;

        const invoice = await prisma.invoice.create({
          data: {
            projetoId: ctx.projetoId,
            clienteId: (await prisma.proposta.findUnique({ where: { id: ctx.propostaId }, select: { clienteId: true } }))!.clienteId,
            valorTotal: valorInvoice,
            subtotal: valorInvoice,
            saldo: valorInvoice,
            status: 'SENT',
            notas,
            numeroInvoice: `INV-${Date.now()}`,
            dataEmissao: new Date(),
            dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            criadoPor: ctx.approvedBy,
          },
        });

        ctx.invoiceId = invoice.id;
      },
    },
  ];
}

export { createProposalApprovedSteps, type ProposalApprovedContext };
