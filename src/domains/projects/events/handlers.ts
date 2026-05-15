/**
 * Project Event Handlers — DEPRECATED (not connected to production)
 *
 * @deprecated This module was built in Fase 8 using a domain-specific ProjectEventEmitter
 * that is NOT connected to the production EventBus (src/server/events/event-bus.ts).
 *
 * Production audit trail is handled in src/server/events/register-handlers.ts:
 * - project.statusChanged → writes AuditLog (STATUS_ALTERADO)
 * - project.completed    → writes AuditLog (PROJETO_CONCLUIDO)
 *
 * The handlers below are no-op stubs. They exist for potential future integration
 * (queues, external notifications, analytics) and should NOT be used in production
 * until connected to the real EventBus.
 */

import {
  ProjectEvent,
  ProjectEventType,
  InvoiceVencidoEvent,
  EtapaAtrasadaEvent,
} from './types';

/**
 * Log handler — tracks all events.
 * TODO: integrate with a proper logger (e.g. Pino, Winston, Datadog)
 */
export async function logEventHandler(_event: ProjectEvent): Promise<void> {
  // no-op until real logger is integrated
}

/**
 * Queue handler — enqueues events for async processing.
 * TODO: connect to RabbitMQ / SQS when message queue is set up
 * Example:
 *   await rabbitMQ.publish('projects.events', event)
 *   await sqs.sendMessage({ QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(event) })
 */
export async function queueEventHandler(_event: ProjectEvent): Promise<void> {
  // no-op until message queue is integrated
}

/**
 * Notification handler — sends in-app or push notifications.
 * TODO: connect to the notifications system (src/services/notifications)
 */
export async function notificationEventHandler(_event: ProjectEvent): Promise<void> {
  // no-op until notifications system is integrated
}

/**
 * Email handler — sends transactional emails for critical events.
 * Only fires for: PROJETO_CONCLUIDO, INVOICE_VENCIDO, ETAPA_ATRASADA, PAGAMENTO_RECEBIDO
 * TODO: connect to email service (SendGrid / Resend / SES)
 */
export async function emailEventHandler(event: ProjectEvent): Promise<void> {
  const criticalEvents = [
    ProjectEventType.PROJETO_CONCLUIDO,
    ProjectEventType.INVOICE_VENCIDO,
    ProjectEventType.ETAPA_ATRASADA,
    ProjectEventType.PAGAMENTO_RECEBIDO,
  ];

  if (!criticalEvents.includes(event.eventType)) return;
  // no-op until email service is integrated
}

/**
 * Webhook handler — notifies external systems.
 * Only fires for: PROJETO_CRIADO, STATUS_ALTERADO, PROJETO_CONCLUIDO, INVOICE_GERADO, PAGAMENTO_RECEBIDO
 * TODO: implement webhook registry and delivery
 */
export async function webhookEventHandler(event: ProjectEvent): Promise<void> {
  const webhookEvents = [
    ProjectEventType.PROJETO_CRIADO,
    ProjectEventType.STATUS_ALTERADO,
    ProjectEventType.PROJETO_CONCLUIDO,
    ProjectEventType.INVOICE_GERADO,
    ProjectEventType.PAGAMENTO_RECEBIDO,
  ];

  if (!webhookEvents.includes(event.eventType)) return;
  // no-op until webhook delivery is implemented
}

/**
 * Analytics handler — records events for business intelligence.
 * TODO: connect to analytics platform (Posthog, Mixpanel, Amplitude)
 */
export async function analyticsEventHandler(_event: ProjectEvent): Promise<void> {
  // no-op until analytics is integrated
}

/**
 * Audit handler — writes compliance trail for critical actions.
 * Only fires for: PROJETO_CRIADO, PROJETO_EXCLUIDO, STATUS_ALTERADO,
 *                 PROPOSTA_APROVADA, INVOICE_GERADO, PAGAMENTO_RECEBIDO
 * TODO: persist to AuditLog table via prisma
 */
export async function auditEventHandler(event: ProjectEvent): Promise<void> {
  const auditableEvents = [
    ProjectEventType.PROJETO_CRIADO,
    ProjectEventType.PROJETO_EXCLUIDO,
    ProjectEventType.STATUS_ALTERADO,
    ProjectEventType.PROPOSTA_APROVADA,
    ProjectEventType.INVOICE_GERADO,
    ProjectEventType.PAGAMENTO_RECEBIDO,
  ];

  if (!auditableEvents.includes(event.eventType)) return;

  // Critical events emit an error log so they're visible in server logs even without a proper logger
  if (
    event.eventType === ProjectEventType.PROJETO_EXCLUIDO ||
    event.eventType === ProjectEventType.INVOICE_VENCIDO ||
    event.eventType === ProjectEventType.ETAPA_ATRASADA
  ) {
    const extra =
      event.eventType === ProjectEventType.INVOICE_VENCIDO
        ? ` invoice=${(event as InvoiceVencidoEvent).data?.numeroInvoice}`
        : event.eventType === ProjectEventType.ETAPA_ATRASADA
          ? ` etapa=${(event as EtapaAtrasadaEvent).data?.nomeEtapa}`
          : '';
    console.error(
      `[AUDIT] ${event.eventType} | projetoId=${event.projetoId}${extra} | eventId=${event.eventId}`
    );
  }

  // TODO: await prisma.auditLog.create({ data: { ... } })
}

/**
 * Registers all event handlers on the emitter.
 */
export function registerMockHandlers(emitter: any): void {
  emitter.onAny(logEventHandler);
  emitter.onAny(queueEventHandler);

  emitter.on(
    [
      ProjectEventType.PROJETO_CRIADO,
      ProjectEventType.STATUS_ALTERADO,
      ProjectEventType.PROJETO_CONCLUIDO,
      ProjectEventType.TAREFA_ATRIBUIDA,
      ProjectEventType.ETAPA_ATRASADA,
      ProjectEventType.INVOICE_VENCIDO,
      ProjectEventType.PAGAMENTO_RECEBIDO,
    ],
    notificationEventHandler
  );

  emitter.on(
    [
      ProjectEventType.PROJETO_CONCLUIDO,
      ProjectEventType.INVOICE_VENCIDO,
      ProjectEventType.ETAPA_ATRASADA,
      ProjectEventType.PAGAMENTO_RECEBIDO,
    ],
    emailEventHandler
  );

  emitter.on(
    [
      ProjectEventType.PROJETO_CRIADO,
      ProjectEventType.STATUS_ALTERADO,
      ProjectEventType.PROJETO_CONCLUIDO,
      ProjectEventType.INVOICE_GERADO,
      ProjectEventType.PAGAMENTO_RECEBIDO,
    ],
    webhookEventHandler
  );

  emitter.onAny(analyticsEventHandler);

  emitter.on(
    [
      ProjectEventType.PROJETO_CRIADO,
      ProjectEventType.PROJETO_EXCLUIDO,
      ProjectEventType.STATUS_ALTERADO,
      ProjectEventType.PROPOSTA_APROVADA,
      ProjectEventType.INVOICE_GERADO,
      ProjectEventType.PAGAMENTO_RECEBIDO,
    ],
    auditEventHandler
  );
}
