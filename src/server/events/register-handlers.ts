import { eventBus } from '@/server/events/event-bus';
import { PlaybookRunner } from '@/server/playbooks/runner';
import { createProposalApprovedSteps, ProposalApprovedContext } from '@/server/playbooks/proposal-approved';
import { createProjectCreatedSteps, ProjectCreatedContext } from '@/server/playbooks/project-created';
import { createServiceOrderCompletedSteps, ServiceOrderCompletedContext } from '@/server/playbooks/service-order-completed';
import { createInvoiceOverdueSteps, InvoiceOverdueContext } from '@/server/playbooks/invoice-overdue';
import { prisma } from '@/lib/prisma';

const runner = new PlaybookRunner();

export function registerEventHandlers() {
  // ── proposal.approved ──────────────────────────────────────────
  eventBus.on('proposal.approved', async (event) => {
    const payload = event.payload as { propostaId: number; approvedBy: number };

    const ctx: ProposalApprovedContext = {
      propostaId: payload.propostaId,
      approvedBy: payload.approvedBy,
      correlationId: event.id,
    };

    const steps = createProposalApprovedSteps(ctx);
    const result = await runner.run(steps, ctx);

    if (!result.ok) {
      const failed = result.steps.find((s) => !s.ok);
      console.error(
        `[Playbook] proposal.approved failed at "${failed?.step}": ${failed?.detail}`
      );
    } else {
       
      // eslint-disable-next-line no-console
      console.log(
        `[Playbook] proposal.approved completed — projeto=${ctx.projetoId}${ctx.invoiceId ? ` invoice=${ctx.invoiceId}` : ''}`
      );
    }
  });

  // ── project.created ────────────────────────────────────────────
  eventBus.on('project.created', async (event) => {
    const payload = event.payload as { projetoId: number; fromPropostaId?: number; createdBy: number };

    const ctx: ProjectCreatedContext = {
      projetoId: payload.projetoId,
      fromPropostaId: payload.fromPropostaId,
      createdBy: payload.createdBy,
      correlationId: event.id,
    };

    const steps = createProjectCreatedSteps(ctx);
    const result = await runner.run(steps, ctx);

    if (!result.ok) {
      const failed = result.steps.find((s) => !s.ok);
      console.error(`[Playbook] project.created failed at "${failed?.step}": ${failed?.detail}`);
     
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Playbook] project.created completed — projeto=${ctx.projetoId}${ctx.triagemId ? ` triagem=${ctx.triagemId}` : ''}`);
    }
  });

  // ── serviceOrder.completed ─────────────────────────────────────
  eventBus.on('serviceOrder.completed', async (event) => {
    const payload = event.payload as { serviceOrderId: number; completedBy: number };

    const ctx: ServiceOrderCompletedContext = {
      serviceOrderId: payload.serviceOrderId,
      completedBy: payload.completedBy,
      correlationId: event.id,
    };

    const steps = createServiceOrderCompletedSteps(ctx);
    const result = await runner.run(steps, ctx);

    if (!result.ok) {
      const failed = result.steps.find((s) => !s.ok);
       
      console.error(`[Playbook] serviceOrder.completed failed at "${failed?.step}": ${failed?.detail}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Playbook] serviceOrder.completed — SO=${ctx.serviceOrderId}${ctx.invoiceId ? ` invoice=${ctx.invoiceId}` : ''}`);
    }
  });

  // ── invoice.overdue ────────────────────────────────────────────
  eventBus.on('invoice.overdue', async (event) => {
    const payload = event.payload as { invoiceId: number };

    const ctx: InvoiceOverdueContext = {
      invoiceId: payload.invoiceId,
      correlationId: event.id,
    };

    const steps = createInvoiceOverdueSteps(ctx);
    const result = await runner.run(steps, ctx);

    if (!result.ok) {
       
      const failed = result.steps.find((s) => !s.ok);
      console.error(`[Playbook] invoice.overdue failed at "${failed?.step}": ${failed?.detail}`);
    } else {
       
      // eslint-disable-next-line no-console
      console.log(`[Playbook] invoice.overdue — invoice=${ctx.invoiceId}`);
    }
  });

  // ── project.statusChanged → AuditLog ──────────────────────────
  eventBus.on('project.statusChanged', async (event) => {
    const payload = event.payload as {
      projetoId: number;
      oldStatus: string;
      newStatus: string;
      changedBy: number;
    };

    try {
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: payload.changedBy,
          entidade: 'Projeto',
          entidadeId: String(payload.projetoId),
          acao: 'STATUS_ALTERADO',
          diff: JSON.stringify({ oldStatus: payload.oldStatus, newStatus: payload.newStatus }),
        },
      });
    } catch (err) {
      console.error('[EventBus] Failed to write AuditLog for project.statusChanged:', err);
    }
  });

  // ── project.completed → AuditLog ──────────────────────────────
  eventBus.on('project.completed', async (event) => {
    const payload = event.payload as { projetoId: number; completedBy: number };

    try {
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: payload.completedBy,
          entidade: 'Projeto',
          entidadeId: String(payload.projetoId),
          acao: 'PROJETO_CONCLUIDO',
          diff: JSON.stringify({ completedAt: new Date().toISOString() }),
        },
      });
    } catch (err) {
      console.error('[EventBus] Failed to write AuditLog for project.completed:', err);
    }
  });

  // eslint-disable-next-line no-console
  console.log('[EventBus] All handlers registered: proposal.approved, project.created, project.statusChanged, project.completed, serviceOrder.completed, invoice.overdue');
}
