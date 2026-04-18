/**
 * Event Types - Módulo Projects
 * Fase 8: Sistema de Eventos e Notificações
 * 
 * Define todos os tipos de eventos emitidos pelo módulo de projetos
 */

/**
 * Tipos de eventos do módulo Projects
 */
export enum ProjectEventType {
  // Eventos de Projeto
  PROJETO_CRIADO = 'projeto.criado',
  PROJETO_ATUALIZADO = 'projeto.atualizado',
  PROJETO_EXCLUIDO = 'projeto.excluido',
  
  // Eventos de Status
  STATUS_ALTERADO = 'projeto.status_alterado',
  PROJETO_INICIADO = 'projeto.iniciado',
  PROJETO_SUSPENSO = 'projeto.suspenso',
  PROJETO_REATIVADO = 'projeto.reativado',
  PROJETO_CONCLUIDO = 'projeto.concluido',
  PROJETO_CANCELADO = 'projeto.cancelado',
  
  // Eventos de Proposta
  PROPOSTA_CRIADA = 'projeto.proposta_criada',
  PROPOSTA_APROVADA = 'projeto.proposta_aprovada',
  PROPOSTA_REJEITADA = 'projeto.proposta_rejeitada',
  
  // Eventos de Etapas
  ETAPA_CRIADA = 'projeto.etapa_criada',
  ETAPA_INICIADA = 'projeto.etapa_iniciada',
  ETAPA_CONCLUIDA = 'projeto.etapa_concluida',
  ETAPA_ATRASADA = 'projeto.etapa_atrasada',
  
  // Eventos de Tarefas
  TAREFA_CRIADA = 'projeto.tarefa_criada',
  TAREFA_ATRIBUIDA = 'projeto.tarefa_atribuida',
  TAREFA_CONCLUIDA = 'projeto.tarefa_concluida',
  TAREFA_ATRASADA = 'projeto.tarefa_atrasada',
  
  // Eventos de Materiais
  MATERIAL_LIBERADO = 'projeto.material_liberado',
  MATERIAL_DEVOLVIDO = 'projeto.material_devolvido',
  MATERIAL_FALTANDO = 'projeto.material_faltando',
  
  // Eventos de Triagem
  TRIAGEM_CRIADA = 'projeto.triagem_criada',
  TRIAGEM_INICIADA = 'projeto.triagem_iniciada',
  TRIAGEM_CONCLUIDA = 'projeto.triagem_concluida',
  TRIAGEM_APROVADA = 'projeto.triagem_aprovada',
  TRIAGEM_REPROVADA = 'projeto.triagem_reprovada',
  
  // Eventos Financeiros
  INVOICE_GERADO = 'projeto.invoice_gerado',
  PAGAMENTO_RECEBIDO = 'projeto.pagamento_recebido',
  INVOICE_VENCIDO = 'projeto.invoice_vencido',
  
  // Eventos de Anexos
  ANEXO_ADICIONADO = 'projeto.anexo_adicionado',
  ANEXO_REMOVIDO = 'projeto.anexo_removido',
  
  // Eventos de Notificação
  NOTIFICACAO_ENVIADA = 'projeto.notificacao_enviada',
  EMAIL_ENVIADO = 'projeto.email_enviado',
}

/**
 * Prioridade do evento
 */
export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Base para todos os eventos
 */
export interface BaseProjectEvent {
  eventId: string;
  eventType: ProjectEventType;
  timestamp: Date;
  priority: EventPriority;
  projetoId: number;
  usuarioId?: number;
  metadata?: Record<string, any>;
}

/**
 * Evento de criação de projeto
 */
export interface ProjetoCriadoEvent extends BaseProjectEvent {
  eventType: ProjectEventType.PROJETO_CRIADO;
  data: {
    projetoId: number;
    nome: string;
    clienteId: number;
    criadoPor: number;
    prioridade: string;
  };
}

/**
 * Evento de alteração de status
 */
export interface StatusAlteradoEvent extends BaseProjectEvent {
  eventType: ProjectEventType.STATUS_ALTERADO;
  data: {
    projetoId: number;
    statusAnterior: string;
    statusNovo: string;
    motivo?: string;
    alteradoPor: number;
  };
}

/**
 * Evento de conclusão de projeto
 */
export interface ProjetoConcluidoEvent extends BaseProjectEvent {
  eventType: ProjectEventType.PROJETO_CONCLUIDO;
  data: {
    projetoId: number;
    nome: string;
    dataInicio: Date;
    dataConclusao: Date;
    tempoDecorrido: number; // em dias
    concluidoPor: number;
  };
}

/**
 * Evento de proposta aprovada
 */
export interface PropostaAprovadaEvent extends BaseProjectEvent {
  eventType: ProjectEventType.PROPOSTA_APROVADA;
  data: {
    projetoId: number;
    propostaId: number;
    valor: number;
    aprovadoPor: number;
    aprovadoEm: Date;
  };
}

/**
 * Evento de etapa atrasada
 */
export interface EtapaAtrasadaEvent extends BaseProjectEvent {
  eventType: ProjectEventType.ETAPA_ATRASADA;
  priority: EventPriority.HIGH;
  data: {
    projetoId: number;
    etapaId: number;
    nomeEtapa: string;
    dataPrevisao: Date;
    diasAtraso: number;
    responsavelId?: number;
  };
}

/**
 * Evento de tarefa atribuída
 */
export interface TarefaAtribuidaEvent extends BaseProjectEvent {
  eventType: ProjectEventType.TAREFA_ATRIBUIDA;
  data: {
    projetoId: number;
    tarefaId: number;
    nomeTarefa: string;
    atribuidoA: number;
    atribuidoPor: number;
    prazo?: Date;
  };
}

/**
 * Evento de material liberado
 */
export interface MaterialLiberadoEvent extends BaseProjectEvent {
  eventType: ProjectEventType.MATERIAL_LIBERADO;
  data: {
    projetoId: number;
    materialId: number;
    nomeMaterial: string;
    quantidade: number;
    liberadoPor: number;
    liberadoEm: Date;
  };
}

/**
 * Evento de triagem criada
 */
export interface TriagemCriadaEvent extends BaseProjectEvent {
  eventType: ProjectEventType.TRIAGEM_CRIADA;
  data: {
    projetoId: number;
    triagemId: string;
    tipo: string;
    titulo: string;
    descricao: string;
    criadoPor: number;
    prioridade: string;
  };
}

/**
 * Evento de invoice gerado
 */
export interface InvoiceGeradoEvent extends BaseProjectEvent {
  eventType: ProjectEventType.INVOICE_GERADO;
  priority: EventPriority.HIGH;
  data: {
    projetoId: number;
    invoiceId: string;
    numeroInvoice: string;
    valorTotal: number;
    dataVencimento: Date;
    geradoPor: number;
  };
}

/**
 * Evento de invoice vencido
 */
export interface InvoiceVencidoEvent extends BaseProjectEvent {
  eventType: ProjectEventType.INVOICE_VENCIDO;
  priority: EventPriority.CRITICAL;
  data: {
    projetoId: number;
    invoiceId: string;
    numeroInvoice: string;
    valorPendente: number;
    dataVencimento: Date;
    diasVencido: number;
  };
}

/**
 * Evento de pagamento recebido
 */
export interface PagamentoRecebidoEvent extends BaseProjectEvent {
  eventType: ProjectEventType.PAGAMENTO_RECEBIDO;
  priority: EventPriority.HIGH;
  data: {
    projetoId: number;
    invoiceId: string;
    numeroInvoice: string;
    valorPago: number;
    formaPagamento: string;
    dataPagamento: Date;
  };
}

/**
 * Union type de todos os eventos
 */
export type ProjectEvent =
  | ProjetoCriadoEvent
  | StatusAlteradoEvent
  | ProjetoConcluidoEvent
  | PropostaAprovadaEvent
  | EtapaAtrasadaEvent
  | TarefaAtribuidaEvent
  | MaterialLiberadoEvent
  | TriagemCriadaEvent
  | InvoiceGeradoEvent
  | InvoiceVencidoEvent
  | PagamentoRecebidoEvent
  | BaseProjectEvent;

/**
 * Handler de eventos
 */
export type EventHandler<T extends ProjectEvent = ProjectEvent> = (
  event: T
) => Promise<void> | void;

/**
 * Configuração de subscrição
 */
export interface EventSubscription {
  eventType: ProjectEventType | ProjectEventType[];
  handler: EventHandler;
  priority?: EventPriority;
}

/**
 * Resultado de processamento de evento
 */
export interface EventProcessingResult {
  eventId: string;
  eventType: ProjectEventType;
  success: boolean;
  processedAt: Date;
  error?: string;
  handlers: {
    name: string;
    success: boolean;
    duration: number;
    error?: string;
  }[];
}
