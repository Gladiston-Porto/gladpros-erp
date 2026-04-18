/**
 * Event System - Exports
 * Fase 8: Sistema de Eventos e Notificações
 */

// Types
export * from './types';

// Emitter
export {
  ProjectEventEmitter,
  getProjectEventEmitter,
  resetProjectEventEmitter,
  createEvent,
} from './emitter';

// Handlers
export {
  logEventHandler,
  queueEventHandler,
  notificationEventHandler,
  emailEventHandler,
  webhookEventHandler,
  analyticsEventHandler,
  auditEventHandler,
  registerMockHandlers,
} from './handlers';
