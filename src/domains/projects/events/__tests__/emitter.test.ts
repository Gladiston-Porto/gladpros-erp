/**
 * Testes - Sistema de Eventos
 * Fase 8: Testes do Event Emitter e Handlers
 */

import {
  ProjectEventEmitter,
  getProjectEventEmitter,
  resetProjectEventEmitter,
  createEvent,
} from '../emitter';
import {
  ProjectEventType,
  EventPriority,
  ProjetoCriadoEvent,
  StatusAlteradoEvent,
} from '../types';

describe('ProjectEventEmitter', () => {
  let emitter: ProjectEventEmitter;

  beforeEach(() => {
    resetProjectEventEmitter();
    emitter = new ProjectEventEmitter(100);
  });

  describe('Subscrição e Emissão', () => {
    it('deve permitir subscrição a evento específico', async () => {
      const handler = jest.fn();
      
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler);

      const event = createEvent(
        ProjectEventType.PROJETO_CRIADO,
        1,
        { nome: 'Projeto Teste', clienteId: 1, criadoPor: 1 }
      );

      await emitter.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('deve permitir subscrição a múltiplos eventos', async () => {
      const handler = jest.fn();
      
      emitter.on(
        [ProjectEventType.PROJETO_CRIADO, ProjectEventType.PROJETO_ATUALIZADO],
        handler
      );

      const event1 = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      const event2 = createEvent(ProjectEventType.PROJETO_ATUALIZADO, 1, {});

      await emitter.emit(event1);
      await emitter.emit(event2);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('deve permitir handler global (onAny)', async () => {
      const globalHandler = jest.fn();
      
      emitter.onAny(globalHandler);

      const event1 = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      const event2 = createEvent(ProjectEventType.STATUS_ALTERADO, 1, {});

      await emitter.emit(event1);
      await emitter.emit(event2);

      expect(globalHandler).toHaveBeenCalledTimes(2);
    });

    it('deve remover handler específico', async () => {
      const handler = jest.fn();
      
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler);
      emitter.off(ProjectEventType.PROJETO_CRIADO, handler);

      const event = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      await emitter.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('deve remover todos os handlers de um evento', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler1);
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler2);
      emitter.removeAllListeners(ProjectEventType.PROJETO_CRIADO);

      const event = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      await emitter.emit(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Processamento de Eventos', () => {
    it('deve executar múltiplos handlers para o mesmo evento', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler1);
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler2);
      emitter.onAny(handler3);

      const event = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      const result = await emitter.emit(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
      expect(result.handlers).toHaveLength(3);
      expect(result.success).toBe(true);
    });

    it('deve capturar erros em handlers sem interromper outros', async () => {
      const handler1 = jest.fn(() => {
        throw new Error('Erro intencional');
      });
      const handler2 = jest.fn();
      
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler1);
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler2);

      const event = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      const result = await emitter.emit(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.handlers[0].success).toBe(false);
      expect(result.handlers[0].error).toContain('Erro intencional');
      expect(result.handlers[1].success).toBe(true);
    });

    it('deve retornar resultado de processamento detalhado', async () => {
      const handler = jest.fn();
      
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler);

      const event = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      const result = await emitter.emit(event);

      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('eventType');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('processedAt');
      expect(result).toHaveProperty('handlers');
      expect(result.handlers[0]).toHaveProperty('name');
      expect(result.handlers[0]).toHaveProperty('success');
      expect(result.handlers[0]).toHaveProperty('duration');
    });
  });

  describe('Histórico de Eventos', () => {
    it('deve manter histórico de eventos emitidos', async () => {
      const event1 = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      const event2 = createEvent(ProjectEventType.STATUS_ALTERADO, 1, {});

      await emitter.emit(event1);
      await emitter.emit(event2);

      const history = emitter.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].eventType).toBe(ProjectEventType.PROJETO_CRIADO);
      expect(history[1].eventType).toBe(ProjectEventType.STATUS_ALTERADO);
    });

    it('deve filtrar histórico por tipo de evento', async () => {
      await emitter.emit(createEvent(ProjectEventType.PROJETO_CRIADO, 1, {}));
      await emitter.emit(createEvent(ProjectEventType.STATUS_ALTERADO, 1, {}));
      await emitter.emit(createEvent(ProjectEventType.PROJETO_CRIADO, 2, {}));

      const history = emitter.getHistory({
        eventType: ProjectEventType.PROJETO_CRIADO,
      });

      expect(history).toHaveLength(2);
      expect(history.every(e => e.eventType === ProjectEventType.PROJETO_CRIADO)).toBe(true);
    });

    it('deve filtrar histórico por projeto', async () => {
      await emitter.emit(createEvent(ProjectEventType.PROJETO_CRIADO, 1, {}));
      await emitter.emit(createEvent(ProjectEventType.STATUS_ALTERADO, 2, {}));
      await emitter.emit(createEvent(ProjectEventType.PROJETO_ATUALIZADO, 1, {}));

      const history = emitter.getHistory({ projetoId: 1 });

      expect(history).toHaveLength(2);
      expect(history.every(e => e.projetoId === 1)).toBe(true);
    });

    it('deve limitar tamanho do histórico', async () => {
      const smallEmitter = new ProjectEventEmitter(5);

      for (let i = 0; i < 10; i++) {
        await smallEmitter.emit(createEvent(ProjectEventType.PROJETO_CRIADO, i, {}));
      }

      const history = smallEmitter.getHistory();
      expect(history).toHaveLength(5);
    });

    it('deve limpar histórico', async () => {
      await emitter.emit(createEvent(ProjectEventType.PROJETO_CRIADO, 1, {}));
      await emitter.emit(createEvent(ProjectEventType.STATUS_ALTERADO, 1, {}));

      emitter.clearHistory();

      const history = emitter.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Estatísticas', () => {
    it('deve retornar estatísticas corretas', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on(ProjectEventType.PROJETO_CRIADO, handler1);
      emitter.on(ProjectEventType.STATUS_ALTERADO, handler2);
      emitter.onAny(jest.fn());

      await emitter.emit(createEvent(ProjectEventType.PROJETO_CRIADO, 1, {}));
      await emitter.emit(createEvent(ProjectEventType.PROJETO_CRIADO, 2, {}));
      await emitter.emit(createEvent(ProjectEventType.STATUS_ALTERADO, 1, {}));

      const stats = emitter.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByType[ProjectEventType.PROJETO_CRIADO]).toBe(2);
      expect(stats.eventsByType[ProjectEventType.STATUS_ALTERADO]).toBe(1);
      expect(stats.globalHandlerCount).toBe(1);
      expect(stats.handlerCount).toBeGreaterThan(0);
    });
  });

  describe('createEvent Helper', () => {
    it('deve criar evento com ID único', () => {
      const event1 = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});
      const event2 = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});

      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('deve criar evento com timestamp', () => {
      const event = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});

      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('deve criar evento com prioridade padrão', () => {
      const event = createEvent(ProjectEventType.PROJETO_CRIADO, 1, {});

      expect(event.priority).toBe(EventPriority.NORMAL);
    });

    it('deve criar evento com prioridade customizada', () => {
      const event = createEvent(
        ProjectEventType.INVOICE_VENCIDO,
        1,
        {},
        { priority: EventPriority.CRITICAL }
      );

      expect(event.priority).toBe(EventPriority.CRITICAL);
    });

    it('deve criar evento com usuarioId', () => {
      const event = createEvent(
        ProjectEventType.PROJETO_CRIADO,
        1,
        {},
        { usuarioId: 123 }
      );

      expect(event.usuarioId).toBe(123);
    });

    it('deve criar evento com metadata', () => {
      const metadata = { ip: '192.168.1.1', userAgent: 'Mozilla' };
      const event = createEvent(
        ProjectEventType.PROJETO_CRIADO,
        1,
        {},
        { metadata }
      );

      expect(event.metadata).toEqual(metadata);
    });
  });

  describe('Singleton', () => {
    it('deve retornar a mesma instância', () => {
      const instance1 = getProjectEventEmitter();
      const instance2 = getProjectEventEmitter();

      expect(instance1).toBe(instance2);
    });

    it('deve resetar singleton', () => {
      const instance1 = getProjectEventEmitter();
      resetProjectEventEmitter();
      const instance2 = getProjectEventEmitter();

      expect(instance1).not.toBe(instance2);
    });
  });
});
