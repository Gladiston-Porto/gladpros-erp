import { randomUUID } from 'crypto';
import { DomainEvent, DomainEventHandler, DomainEventName, EventHandlerContext } from './event-types';
import { prisma } from '@/lib/prisma';

export class EventBus {
  private handlers = new Map<DomainEventName, Set<DomainEventHandler>>();

  on<TPayload = Record<string, unknown>>(name: DomainEventName, handler: DomainEventHandler<TPayload>) {
    if (!this.handlers.has(name)) {
      this.handlers.set(name, new Set());
    }

    this.handlers.get(name)!.add(handler as DomainEventHandler);
  }

  async emit<TPayload extends Record<string, unknown> = Record<string, unknown>>(
    event: Omit<DomainEvent<TPayload>, 'id' | 'occurredAt'>,
    context: EventHandlerContext = {}
  ) {
    const fullEvent: DomainEvent<TPayload> = {
      ...event,
      id: randomUUID(),
      occurredAt: new Date(),
    };

    // Persist event to database
    await prisma.domainEvent.create({
      data: {
        id: fullEvent.id,
        name: fullEvent.name,
        aggregateType: fullEvent.aggregateType,
        aggregateId: fullEvent.aggregateId,
        correlationId: fullEvent.correlationId ?? context.correlationId ?? null,
        payload: JSON.stringify(fullEvent.payload),
        status: 'PENDING',
        occurredAt: fullEvent.occurredAt,
      },
    }).catch((err) => console.error('[EventBus] Failed to persist event:', err));

    // Execute handlers
    const handlers = Array.from(this.handlers.get(fullEvent.name) ?? []);
    let handlerError: Error | null = null;

    for (const handler of handlers) {
      try {
        await handler(fullEvent, context);
      } catch (err) {
        handlerError = err instanceof Error ? err : new Error(String(err));
        console.error(`[EventBus] Handler failed for ${fullEvent.name}:`, err);
      }
    }

    // Update event status
    await prisma.domainEvent.update({
      where: { id: fullEvent.id },
      data: {
        status: handlerError ? 'FAILED' : 'PROCESSED',
        processedAt: new Date(),
        error: handlerError?.message ?? null,
      },
    }).catch((err) => console.error('[EventBus] Failed to update event status:', err));

    return fullEvent;
  }
}

export const eventBus = new EventBus();