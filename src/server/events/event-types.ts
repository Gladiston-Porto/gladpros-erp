export type DomainEventName =
  | 'proposal.approved'
  | 'project.created'
  | 'project.statusChanged'
  | 'project.completed'
  | 'project.closingRequested'
  | 'serviceOrder.completed'
  | 'serviceOrder.statusChanged'
  | 'invoice.created'
  | 'invoice.overdue'
  | 'invoice.paid';

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: DomainEventName;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
  occurredAt: Date;
  payload: TPayload;
}

export interface EventHandlerContext {
  correlationId?: string;
}

export type DomainEventHandler<TPayload = Record<string, unknown>> = (
  event: DomainEvent<TPayload>,
  context: EventHandlerContext
) => Promise<void>;