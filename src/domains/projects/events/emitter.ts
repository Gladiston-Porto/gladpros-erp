/**
 * Project Event Emitter
 * Fase 8: Sistema de Eventos e Notificações
 * 
 * Event Bus interno para publicação e subscrição de eventos do módulo Projects
 */

import {
  ProjectEvent,
  ProjectEventType,
  EventHandler,
  EventSubscription,
  EventProcessingResult,
  EventPriority,
  BaseProjectEvent,
} from './types';

/**
 * Event Emitter para o módulo Projects
 */
export class ProjectEventEmitter {
  private handlers: Map<ProjectEventType, Set<EventHandler>>;
  private globalHandlers: Set<EventHandler>;
  private eventHistory: ProjectEvent[];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 1000) {
    this.handlers = new Map();
    this.globalHandlers = new Set();
    this.eventHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Registra um handler para um ou mais tipos de eventos
   */
  on(
    eventTypes: ProjectEventType | ProjectEventType[],
    handler: EventHandler
  ): void {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    types.forEach(eventType => {
      if (!this.handlers.has(eventType)) {
        this.handlers.set(eventType, new Set());
      }
      this.handlers.get(eventType)!.add(handler);
    });
  }

  /**
   * Registra um handler global que recebe todos os eventos
   */
  onAny(handler: EventHandler): void {
    this.globalHandlers.add(handler);
  }

  /**
   * Remove um handler específico
   */
  off(eventType: ProjectEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Remove um handler global
   */
  offAny(handler: EventHandler): void {
    this.globalHandlers.delete(handler);
  }

  /**
   * Remove todos os handlers de um tipo de evento
   */
  removeAllListeners(eventType?: ProjectEventType): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
      this.globalHandlers.clear();
    }
  }

  /**
   * Emite um evento
   */
  async emit(event: ProjectEvent): Promise<EventProcessingResult> {
    const startTime = Date.now();
    
    // Adiciona ao histórico
    this.addToHistory(event);

    // Log do evento
    this.logEvent(event);

    const result: EventProcessingResult = {
      eventId: event.eventId,
      eventType: event.eventType,
      success: true,
      processedAt: new Date(),
      handlers: [],
    };

    // Coleta todos os handlers relevantes
    const eventHandlers = this.handlers.get(event.eventType) || new Set();
    const allHandlers = [...eventHandlers, ...this.globalHandlers];

    // Executa cada handler
    for (const handler of allHandlers) {
      const handlerStartTime = Date.now();
      try {
        await handler(event);
        result.handlers.push({
          name: handler.name || 'anonymous',
          success: true,
          duration: Date.now() - handlerStartTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.success = false;
        result.handlers.push({
          name: handler.name || 'anonymous',
          success: false,
          duration: Date.now() - handlerStartTime,
          error: errorMessage,
        });
        console.error(
          `[ProjectEventEmitter] Erro ao processar evento ${event.eventType}:`,
          error
        );
      }
    }

    const totalDuration = Date.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(
      `[ProjectEventEmitter] Evento ${event.eventType} processado em ${totalDuration}ms (${result.handlers.length} handlers)`
    );

    return result;
  }

  /**
   * Emite um evento de forma síncrona (fire and forget)
   */
  emitSync(event: ProjectEvent): void {
    this.emit(event).catch(error => {
      console.error('[ProjectEventEmitter] Erro ao emitir evento:', error);
    });
  }

  /**
   * Obtém o histórico de eventos
   */
  getHistory(
    filters?: {
      eventType?: ProjectEventType;
      projetoId?: number;
      since?: Date;
      limit?: number;
    }
  ): ProjectEvent[] {
    let history = [...this.eventHistory];

    if (filters) {
      if (filters.eventType) {
        history = history.filter(e => e.eventType === filters.eventType);
      }
      if (filters.projetoId) {
        history = history.filter(e => e.projetoId === filters.projetoId);
      }
      if (filters.since) {
        history = history.filter(e => e.timestamp >= filters.since!);
      }
      if (filters.limit) {
        history = history.slice(-filters.limit);
      }
    }

    return history;
  }

  /**
   * Limpa o histórico
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Obtém estatísticas de eventos
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    handlerCount: number;
    globalHandlerCount: number;
  } {
    const eventsByType: Record<string, number> = {};
    
    this.eventHistory.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });

    let totalHandlers = this.globalHandlers.size;
    this.handlers.forEach(handlers => {
      totalHandlers += handlers.size;
    });

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      handlerCount: totalHandlers,
      globalHandlerCount: this.globalHandlers.size,
    };
  }

  /**
   * Adiciona evento ao histórico
   */
  private addToHistory(event: ProjectEvent): void {
    this.eventHistory.push(event);
    
    // Mantém apenas os últimos N eventos
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Log estruturado de evento
   */
  private logEvent(event: ProjectEvent): void {
    const priority = event.priority || EventPriority.NORMAL;
    const emoji = this.getEmojiForEvent(event.eventType);
    
    // eslint-disable-next-line no-console
    console.log(
      `${emoji} [${priority.toUpperCase()}] ${event.eventType} | Projeto: ${event.projetoId} | ${event.eventId}`
    );
  }

  /**
   * Retorna emoji baseado no tipo de evento
   */
  private getEmojiForEvent(eventType: ProjectEventType): string {
    const emojiMap: Record<string, string> = {
      'projeto.criado': '🆕',
      'projeto.atualizado': '✏️',
      'projeto.excluido': '🗑️',
      'projeto.status_alterado': '🔄',
      'projeto.iniciado': '🚀',
      'projeto.suspenso': '⏸️',
      'projeto.reativado': '▶️',
      'projeto.concluido': '✅',
      'projeto.cancelado': '❌',
      'projeto.proposta_criada': '📄',
      'projeto.proposta_aprovada': '✔️',
      'projeto.proposta_rejeitada': '❌',
      'projeto.etapa_criada': '📋',
      'projeto.etapa_iniciada': '▶️',
      'projeto.etapa_concluida': '✅',
      'projeto.etapa_atrasada': '⚠️',
      'projeto.tarefa_criada': '📝',
      'projeto.tarefa_atribuida': '👤',
      'projeto.tarefa_concluida': '✅',
      'projeto.tarefa_atrasada': '⚠️',
      'projeto.material_liberado': '📦',
      'projeto.material_devolvido': '↩️',
      'projeto.material_faltando': '⚠️',
      'projeto.triagem_criada': '🔍',
      'projeto.triagem_iniciada': '▶️',
      'projeto.triagem_concluida': '✅',
      'projeto.triagem_aprovada': '✔️',
      'projeto.triagem_reprovada': '❌',
      'projeto.invoice_gerado': '💰',
      'projeto.pagamento_recebido': '💵',
      'projeto.invoice_vencido': '🔴',
      'projeto.anexo_adicionado': '📎',
      'projeto.anexo_removido': '🗑️',
      'projeto.notificacao_enviada': '📧',
      'projeto.email_enviado': '✉️',
    };

    return emojiMap[eventType] || '📌';
  }
}

// Singleton global
let emitterInstance: ProjectEventEmitter | null = null;

/**
 * Obtém a instância singleton do Event Emitter
 */
export function getProjectEventEmitter(): ProjectEventEmitter {
  if (!emitterInstance) {
    emitterInstance = new ProjectEventEmitter();
  }
  return emitterInstance;
}

/**
 * Reseta o Event Emitter (útil para testes)
 */
export function resetProjectEventEmitter(): void {
  emitterInstance = null;
}

/**
 * Helper para criar eventos com ID único
 */
export function createEvent(
  eventType: ProjectEventType,
  projetoId: number,
  data: any,
  options?: {
    usuarioId?: number;
    priority?: EventPriority;
    metadata?: Record<string, any>;
  }
): ProjectEvent {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    eventType,
    timestamp: new Date(),
    priority: options?.priority || EventPriority.NORMAL,
    projetoId,
    usuarioId: options?.usuarioId,
    metadata: options?.metadata,
    data,
  } as ProjectEvent;
}
