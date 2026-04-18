/**
 * Mock Event Handlers
 * Fase 8: Handlers mockados para eventos
 * 
 * Implementações de exemplo para logging, queue e notificações
 */

import {
  ProjectEvent,
  ProjectEventType,
  EventPriority,
  StatusAlteradoEvent,
  ProjetoConcluidoEvent,
  TarefaAtribuidaEvent,
  InvoiceVencidoEvent,
  EtapaAtrasadaEvent,
} from './types';

/**
 * Handler de Log - registra todos os eventos
 */
export async function logEventHandler(event: ProjectEvent): Promise<void> {
  const timestamp = event.timestamp.toISOString();
  const priority = event.priority || EventPriority.NORMAL;
  
  // eslint-disable-next-line no-console
  console.log(`
[EVENT LOG] ${timestamp}
  Type: ${event.eventType}
  Priority: ${priority}
  Project ID: ${event.projetoId}
  Event ID: ${event.eventId}
  ${event.usuarioId ? `User ID: ${event.usuarioId}` : ''}
  Data: ${JSON.stringify((event as any).data || {}, null, 2)}
  `);
}

/**
 * Handler de Queue - simula envio para fila (RabbitMQ, SQS, etc)
 */
export async function queueEventHandler(event: ProjectEvent): Promise<void> {
  // Simula envio para fila
  // eslint-disable-next-line no-console
  console.log(`[QUEUE] Enfileirando evento ${event.eventType} para projeto ${event.projetoId}`);
  
  // Em produção, aqui iria:
  // await rabbitMQ.publish('projects.events', event);
  // ou
  // await sqs.sendMessage({ QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(event) });
  
  // Mock: apenas simula latência
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // eslint-disable-next-line no-console
  console.log(`[QUEUE] Evento ${event.eventId} enfileirado com sucesso`);
}

/**
 * Handler de Notificações - envia notificações baseadas em eventos
 */
export async function notificationEventHandler(event: ProjectEvent): Promise<void> {
  const notificationMap: Partial<Record<ProjectEventType, string>> = {
    [ProjectEventType.PROJETO_CRIADO]: 'Novo projeto criado!',
    [ProjectEventType.STATUS_ALTERADO]: 'Status do projeto alterado',
    [ProjectEventType.PROJETO_CONCLUIDO]: '🎉 Projeto concluído com sucesso!',
    [ProjectEventType.TAREFA_ATRIBUIDA]: 'Nova tarefa atribuída a você',
    [ProjectEventType.ETAPA_ATRASADA]: '⚠️ Etapa com atraso detectado',
    [ProjectEventType.INVOICE_VENCIDO]: '🔴 Invoice vencido - ação necessária',
    [ProjectEventType.PAGAMENTO_RECEBIDO]: '💰 Pagamento recebido',
  };

  const message = notificationMap[event.eventType];
  
  if (message) {
    // eslint-disable-next-line no-console
    console.log(`[NOTIFICATION] ${message}`);
    // eslint-disable-next-line no-console
    console.log(`[NOTIFICATION] Detalhes: Projeto #${event.projetoId}`);
    
    // Em produção:
    // await sendPushNotification(event.usuarioId, message);
    // await sendInAppNotification(event.usuarioId, message, event.data);
  }
}

/**
 * Handler de Email - envia emails baseados em eventos críticos
 */
export async function emailEventHandler(event: ProjectEvent): Promise<void> {
  const criticalEvents = [
    ProjectEventType.PROJETO_CONCLUIDO,
    ProjectEventType.INVOICE_VENCIDO,
    ProjectEventType.ETAPA_ATRASADA,
    ProjectEventType.PAGAMENTO_RECEBIDO,
  ];

  if (!criticalEvents.includes(event.eventType)) {
    return; // Não envia email para eventos não-críticos
  }

  // eslint-disable-next-line no-console
  console.log(`[EMAIL] Preparando email para evento ${event.eventType}`);
  
  // Seleciona template baseado no evento
  const template = getEmailTemplate(event);
  
  // eslint-disable-next-line no-console
  console.log(`[EMAIL] Template: ${template.subject}`);
  // eslint-disable-next-line no-console
  console.log(`[EMAIL] Destinatário: ${template.to}`);
  // eslint-disable-next-line no-console
  console.log(`[EMAIL] Preview: ${template.preview}`);
  
  // Em produção:
  // await emailService.send({
  //   to: template.to,
  //   subject: template.subject,
  //   html: template.html,
  //   data: template.data,
  // });
  
  // eslint-disable-next-line no-console
  console.log(`[EMAIL] Email enviado com sucesso`);
}

/**
 * Handler de Webhook - notifica sistemas externos
 */
export async function webhookEventHandler(event: ProjectEvent): Promise<void> {
  const webhookEvents = [
    ProjectEventType.PROJETO_CRIADO,
    ProjectEventType.STATUS_ALTERADO,
    ProjectEventType.PROJETO_CONCLUIDO,
    ProjectEventType.INVOICE_GERADO,
    ProjectEventType.PAGAMENTO_RECEBIDO,
  ];

  if (!webhookEvents.includes(event.eventType)) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[WEBHOOK] Notificando sistemas externos sobre ${event.eventType}`);
  
  // Em produção:
  // const webhooks = await getWebhooksForEvent(event.eventType);
  // for (const webhook of webhooks) {
  //   await fetch(webhook.url, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'X-Webhook-Signature': generateSignature(webhook.secret, event),
  //     },
  //     body: JSON.stringify(event),
  //   });
  // }
  
  // eslint-disable-next-line no-console
  console.log(`[WEBHOOK] Notificação enviada`);
}

/**
 * Handler de Analytics - registra eventos para análise
 */
export async function analyticsEventHandler(event: ProjectEvent): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[ANALYTICS] Registrando evento ${event.eventType}`);
  
  // Em produção:
  // await analytics.track({
  //   userId: event.usuarioId,
  //   event: event.eventType,
  //   properties: {
  //     projetoId: event.projetoId,
  //     priority: event.priority,
  //     ...event.data,
  //   },
  //   timestamp: event.timestamp,
  // });
  
  // eslint-disable-next-line no-console
  console.log(`[ANALYTICS] Evento registrado no analytics`);
}

/**
 * Handler de Auditoria - registra para compliance
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

  if (!auditableEvents.includes(event.eventType)) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[AUDIT] Registrando para auditoria: ${event.eventType}`);
  // eslint-disable-next-line no-console
  console.log(`[AUDIT] Usuário: ${event.usuarioId || 'Sistema'}`);
  // eslint-disable-next-line no-console
  console.log(`[AUDIT] Timestamp: ${event.timestamp.toISOString()}`);
  // eslint-disable-next-line no-console
  console.log(`[AUDIT] Dados: ${JSON.stringify((event as any).data, null, 2)}`);
  
  // Em produção:
  // await auditLog.create({
  //   eventType: event.eventType,
  //   userId: event.usuarioId,
  //   projectId: event.projetoId,
  //   timestamp: event.timestamp,
  //   data: event.data,
  //   metadata: event.metadata,
  // });
}

/**
 * Helper para selecionar template de email
 */
function getEmailTemplate(event: ProjectEvent): {
  to: string;
  subject: string;
  html: string;
  preview: string;
  data: any;
} {
  switch (event.eventType) {
    case ProjectEventType.PROJETO_CONCLUIDO: {
      const data = (event as ProjetoConcluidoEvent).data;
      return {
        to: 'cliente@example.com',
        subject: `✅ Projeto ${data.nome} concluído!`,
        html: `<h1>Projeto Concluído</h1><p>O projeto ${data.nome} foi concluído com sucesso.</p>`,
        preview: `Projeto concluído em ${data.tempoDecorrido} dias`,
        data,
      };
    }

    case ProjectEventType.INVOICE_VENCIDO: {
      const data = (event as InvoiceVencidoEvent).data;
      return {
        to: 'financeiro@example.com',
        subject: `🔴 URGENTE: Invoice ${data.numeroInvoice} vencido`,
        html: `<h1>Invoice Vencido</h1><p>Invoice ${data.numeroInvoice} está vencido há ${data.diasVencido} dias.</p>`,
        preview: `Valor pendente: $ ${data.valorPendente.toFixed(2)}`,
        data,
      };
    }

    case ProjectEventType.ETAPA_ATRASADA: {
      const data = (event as EtapaAtrasadaEvent).data;
      return {
        to: 'gerente@example.com',
        subject: `⚠️ Etapa "${data.nomeEtapa}" com atraso`,
        html: `<h1>Etapa Atrasada</h1><p>A etapa ${data.nomeEtapa} está ${data.diasAtraso} dias atrasada.</p>`,
        preview: `Atraso de ${data.diasAtraso} dias`,
        data,
      };
    }

    case ProjectEventType.PAGAMENTO_RECEBIDO: {
      const data = (event as any).data;
      return {
        to: 'financeiro@example.com',
        subject: `💰 Pagamento recebido - ${data.numeroInvoice}`,
        html: `<h1>Pagamento Recebido</h1><p>Pagamento de $ ${data.valorPago} recebido.</p>`,
        preview: `Valor: $ ${data.valorPago.toFixed(2)}`,
        data,
      };
    }

    default:
      return {
        to: 'admin@example.com',
        subject: `Notificação: ${event.eventType}`,
        html: `<h1>Evento do Sistema</h1><p>${event.eventType}</p>`,
        preview: 'Evento do sistema',
        data: (event as any).data,
      };
  }
}

/**
 * Registra todos os handlers mockados
 */
export function registerMockHandlers(emitter: any): void {
  // Log handler - todos os eventos
  emitter.onAny(logEventHandler);

  // Queue handler - todos os eventos
  emitter.onAny(queueEventHandler);

  // Notification handler - eventos específicos
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

  // Email handler - eventos críticos
  emitter.on(
    [
      ProjectEventType.PROJETO_CONCLUIDO,
      ProjectEventType.INVOICE_VENCIDO,
      ProjectEventType.ETAPA_ATRASADA,
      ProjectEventType.PAGAMENTO_RECEBIDO,
    ],
    emailEventHandler
  );

  // Webhook handler - eventos importantes
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

  // Analytics handler - todos os eventos
  emitter.onAny(analyticsEventHandler);

  // Audit handler - eventos críticos
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

  // eslint-disable-next-line no-console
  console.log('[EVENT SYSTEM] Mock handlers registrados com sucesso');
}
