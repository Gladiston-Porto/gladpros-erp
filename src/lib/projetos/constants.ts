/**
 * Constantes e configurações do módulo de Projetos
 */

// Status do Projeto
export const PROJETO_STATUS = {
  PLANEJADO: 'planejado',
  EM_ANDAMENTO: 'em_andamento',
  PAUSADO: 'pausado',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
} as const;

export type ProjetoStatus = typeof PROJETO_STATUS[keyof typeof PROJETO_STATUS];

export const PROJETO_STATUS_LABELS: Record<ProjetoStatus, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const PROJETO_STATUS_COLORS: Record<ProjetoStatus, string> = {
  planejado: 'bg-blue-100 text-blue-800 border-blue-200',
  em_andamento: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pausado: 'bg-orange-100 text-orange-800 border-orange-200',
  concluido: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

// Prioridades
export const PROJETO_PRIORIDADE = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const;

export type ProjetoPrioridade = typeof PROJETO_PRIORIDADE[keyof typeof PROJETO_PRIORIDADE];

export const PROJETO_PRIORIDADE_LABELS: Record<ProjetoPrioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const PROJETO_PRIORIDADE_COLORS: Record<ProjetoPrioridade, string> = {
  baixa: 'bg-gray-100 text-gray-700 border-gray-200',
  media: 'bg-blue-100 text-blue-700 border-blue-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  urgente: 'bg-red-100 text-red-700 border-red-200',
};

// Status de Etapa
export const ETAPA_STATUS = {
  PENDENTE: 'pendente',
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDA: 'concluida',
  BLOQUEADA: 'bloqueada',
} as const;

export type EtapaStatus = typeof ETAPA_STATUS[keyof typeof ETAPA_STATUS];

export const ETAPA_STATUS_LABELS: Record<EtapaStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
};

// Status de Tarefa
export const TAREFA_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;

export type TarefaStatus = typeof TAREFA_STATUS[keyof typeof TAREFA_STATUS];

export const TAREFA_STATUS_LABELS: Record<TarefaStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

export const TAREFA_STATUS_COLORS: Record<TarefaStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// Prioridade de Tarefa
export const TAREFA_PRIORIDADE = {
  BAIXA: 'baixa',
  NORMAL: 'normal',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const;

export type TarefaPrioridade = typeof TAREFA_PRIORIDADE[keyof typeof TAREFA_PRIORIDADE];

// Status de Material
export const MATERIAL_STATUS = {
  RESERVADO: 'reservado',
  ALOCADO: 'alocado',
  EM_USO: 'em_uso',
  DEVOLVIDO: 'devolvido',
} as const;

export type MaterialStatus = typeof MATERIAL_STATUS[keyof typeof MATERIAL_STATUS];

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  reservado: 'Reservado',
  alocado: 'Alocado',
  em_uso: 'Em Uso',
  devolvido: 'Devolvido',
};

// Tipo de Movimentação
export const MOVIMENTACAO_TIPO = {
  RESERVA: 'reserva',
  ALOCACAO: 'alocacao',
  USO: 'uso',
  DEVOLUCAO: 'devolucao',
  AJUSTE: 'ajuste',
} as const;

export type MovimentacaoTipo = typeof MOVIMENTACAO_TIPO[keyof typeof MOVIMENTACAO_TIPO];

// Paginação
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

// Filtros padrão
export const DEFAULT_FILTERS = {
  status: '',
  prioridade: '',
  clienteId: '',
  responsavelId: '',
  dataInicio: '',
  dataFim: '',
  search: '',
};

// Ordenação
export const SORT_OPTIONS = [
  { value: 'numeroProjeto_asc', label: 'Número (A-Z)' },
  { value: 'numeroProjeto_desc', label: 'Número (Z-A)' },
  { value: 'titulo_asc', label: 'Título (A-Z)' },
  { value: 'titulo_desc', label: 'Título (Z-A)' },
  { value: 'dataInicioPrevista_asc', label: 'Data Início (Antiga)' },
  { value: 'dataInicioPrevista_desc', label: 'Data Início (Recente)' },
  { value: 'dataConclusaoPrevista_asc', label: 'Data Conclusão (Antiga)' },
  { value: 'dataConclusaoPrevista_desc', label: 'Data Conclusão (Recente)' },
  { value: 'criadoEm_desc', label: 'Mais Recentes' },
  { value: 'criadoEm_asc', label: 'Mais Antigos' },
];

export const DEFAULT_SORT = 'criadoEm_desc';
