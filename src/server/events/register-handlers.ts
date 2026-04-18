import { eventBus } from '@/server/events/event-bus';
import { PlaybookRunner } from '@/server/playbooks/runner';
import { createProposalApprovedSteps, ProposalApprovedContext } from '@/server/playbooks/proposal-approved';
import { createProjectCreatedSteps, ProjectCreatedContext } from '@/server/playbooks/project-created';
import { createServiceOrderCompletedSteps, ServiceOrderCompletedContext } from '@/server/playbooks/service-order-completed';
import { createInvoiceOverdueSteps, InvoiceOverdueContext } from '@/server/playbooks/invoice-overdue';

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
      console.log(`[Playbook] invoice.overdue — invoice=${ctx.invoiceId}`);
    }
  });

  console.log('[EventBus] All handlers registered: proposal.approved, project.created, serviceOrder.completed, invoice.overdue');
}
