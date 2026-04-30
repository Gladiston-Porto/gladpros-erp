/**
 * Constantes e configurações do módulo de Projetos
 */

// Status do Projeto — alinhado com enum Projeto_status do Prisma
export const PROJETO_STATUS = {
  PLANEJADO: 'planejado',
  EM_EXECUCAO: 'em_execucao',
  EM_INSPECAO: 'em_inspecao',
  AGUARDANDO_DEVOLUCOES: 'aguardando_devolucoes',
  CONCLUIDO: 'concluido',
  ARQUIVADO: 'arquivado',
  SUSPENSO: 'suspenso',
  CANCELADO: 'cancelado',
} as const;

export type ProjetoStatus = typeof PROJETO_STATUS[keyof typeof PROJETO_STATUS];

export const PROJETO_STATUS_LABELS: Record<ProjetoStatus, string> = {
  planejado: 'Planejado',
  em_execucao: 'Em Execução',
  em_inspecao: 'Em Inspeção',
  aguardando_devolucoes: 'Ag. Devoluções',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
};

export const PROJETO_STATUS_COLORS: Record<ProjetoStatus, string> = {
  planejado: 'bg-blue-100 text-blue-800 border-blue-200',
  em_execucao: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  em_inspecao: 'bg-purple-100 text-purple-800 border-purple-200',
  aguardando_devolucoes: 'bg-amber-100 text-amber-800 border-amber-200',
  concluido: 'bg-green-100 text-green-800 border-green-200',
  arquivado: 'bg-gray-100 text-gray-600 border-gray-200',
  suspenso: 'bg-orange-100 text-orange-800 border-orange-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

// Prioridades — alinhado com enum Projeto_prioridade do Prisma
export const PROJETO_PRIORIDADE = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  CRITICA: 'critica',
} as const;

export type ProjetoPrioridade = typeof PROJETO_PRIORIDADE[keyof typeof PROJETO_PRIORIDADE];

export const PROJETO_PRIORIDADE_LABELS: Record<ProjetoPrioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const PROJETO_PRIORIDADE_COLORS: Record<ProjetoPrioridade, string> = {
  baixa: 'bg-gray-100 text-gray-700 border-gray-200',
  media: 'bg-blue-100 text-blue-700 border-blue-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  critica: 'bg-red-100 text-red-700 border-red-200',
};

// Status de Etapa — alinhado com enum ProjetoEtapa_status do Prisma
export const ETAPA_STATUS = {
  PENDENTE: 'pendente',
  EM_ANDAMENTO: 'em_andamento',
  EM_VALIDACAO: 'em_validacao',
  CONCLUIDA: 'concluida',
  BLOQUEADA: 'bloqueada',
  CANCELADA: 'cancelada',
} as const;

export type EtapaStatus = typeof ETAPA_STATUS[keyof typeof ETAPA_STATUS];

export const ETAPA_STATUS_LABELS: Record<EtapaStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  em_validacao: 'Em Validação',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
  cancelada: 'Cancelada',
};

// Status de Tarefa — alinhado com enum ProjetoTarefa_status do Prisma
export const TAREFA_STATUS = {
  ABERTA: 'aberta',
  EM_ANDAMENTO: 'em_andamento',
  BLOQUEADA: 'bloqueada',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
} as const;

export type TarefaStatus = typeof TAREFA_STATUS[keyof typeof TAREFA_STATUS];

export const TAREFA_STATUS_LABELS: Record<TarefaStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  bloqueada: 'Bloqueada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const TAREFA_STATUS_COLORS: Record<TarefaStatus, string> = {
  aberta: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  bloqueada: 'bg-red-100 text-red-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
};

// Prioridade de Tarefa — alinhado com enum Projeto_prioridade do Prisma
export const TAREFA_PRIORIDADE = {
  BAIXA: 'baixa',
  NORMAL: 'normal',
  ALTA: 'alta',
  CRITICA: 'critica',
} as const;

export type TarefaPrioridade = typeof TAREFA_PRIORIDADE[keyof typeof TAREFA_PRIORIDADE];

// Status de Material — alinhado com enum ProjetoMaterial_status do Prisma
export const MATERIAL_STATUS = {
  PLANEJADO: 'planejado',
  LIBERADO: 'liberado',
  EM_USO: 'em_uso',
  DEVOLUCAO_PENDENTE: 'devolucao_pendente',
  TRIAGEM_PENDENTE: 'triagem_pendente',
  FINALIZADO: 'finalizado',
} as const;

export type MaterialStatus = typeof MATERIAL_STATUS[keyof typeof MATERIAL_STATUS];

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  planejado: 'Planejado',
  liberado: 'Liberado',
  em_uso: 'Em Uso',
  devolucao_pendente: 'Devolução Pendente',
  triagem_pendente: 'Triagem Pendente',
  finalizado: 'Finalizado',
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
