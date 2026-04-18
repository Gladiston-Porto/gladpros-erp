/**
 * Entidades de domínio do módulo Projetos
 * Tipos base que representam os modelos de negócio
 */

// Tipos de enums (serão substituídos pelos do Prisma Client após regeneração completa)
export type Projeto_status = 
  | 'planejado'
  | 'em_execucao'
  | 'em_inspecao'
  | 'aguardando_devolucoes'
  | 'concluido'
  | 'arquivado'
  | 'suspenso'
  | 'cancelado';

export type Projeto_prioridade = 'baixa' | 'media' | 'alta' | 'critica';

export type ProjetoEtapa_status = 
  | 'pendente'
  | 'em_andamento'
  | 'em_validacao'
  | 'concluida'
  | 'bloqueada'
  | 'cancelada';

export type ProjetoMaterial_status = 
  | 'planejado'
  | 'liberado'
  | 'em_uso'
  | 'devolucao_pendente'
  | 'triagem_pendente'
  | 'finalizado';

export type ProjetoTarefa_status = 
  | 'aberta'
  | 'em_andamento'
  | 'bloqueada'
  | 'concluida'
  | 'cancelada';

// ============================================================================
// PROJETO
// ============================================================================

export interface Projeto {
  id: number;
  numeroProjeto: string;
  titulo: string;
  descricao: string | null;
  status: Projeto_status;
  prioridade: Projeto_prioridade;
  clienteId: number;
  propostaId: number | null;
  responsavelId: number | null;
  dataInicio: Date | null;
  dataPrevisao: Date | null;
  dataConclusao: Date | null;
  valorOrcado: number | null;
  valorRealizado: number | null;
  observacoes: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPorId: number;
}

export interface ProjetoWithRelations extends Projeto {
  cliente?: {
    id: number;
    nome: string;
    email: string | null;
  };
  proposta?: {
    id: number;
    numero: string;
    valor: number;
  };
  responsavel?: {
    id: number;
    nome: string;
    email: string;
  };
  criadoPor: {
    id: number;
    nome: string;
    email: string;
  };
  etapas?: ProjetoEtapa[];
  materiais?: ProjetoMaterial[];
  tarefas?: ProjetoTarefa[];
  anexos?: ProjetoAnexo[];
  historico?: ProjetoHistorico[];
}

// ============================================================================
// ETAPA
// ============================================================================

export interface ProjetoEtapa {
  id: number;
  projetoId: number;
  ordem: number;
  titulo: string;
  descricao: string | null;
  status: ProjetoEtapa_status;
  dataInicio: Date | null;
  dataPrevisao: Date | null;
  dataConclusao: Date | null;
  percentualConclusao: number;
  observacoes: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProjetoEtapaWithRelations extends ProjetoEtapa {
  projeto?: Pick<Projeto, 'id' | 'numeroProjeto' | 'titulo'>;
  tarefas?: ProjetoTarefa[];
}

// ============================================================================
// MATERIAL
// ============================================================================

export interface ProjetoMaterial {
  id: number;
  projetoId: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  status: ProjetoMaterial_status;
  dataAlocacao: Date | null;
  dataDevolucao: Date | null;
  observacoes: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProjetoMaterialWithRelations extends ProjetoMaterial {
  projeto?: Pick<Projeto, 'id' | 'numeroProjeto' | 'titulo'>;
}

// ============================================================================
// TAREFA
// ============================================================================

export interface ProjetoTarefa {
  id: number;
  projetoId: number;
  etapaId: number | null;
  titulo: string;
  descricao: string | null;
  status: ProjetoTarefa_status;
  prioridade: Projeto_prioridade;
  responsavelId: number | null;
  dataPrevista: Date | null;
  dataConclusao: Date | null;
  observacoes: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProjetoTarefaWithRelations extends ProjetoTarefa {
  projeto?: Pick<Projeto, 'id' | 'numeroProjeto' | 'titulo'>;
  etapa?: Pick<ProjetoEtapa, 'id' | 'titulo'>;
  responsavel?: {
    id: number;
    nome: string;
    email: string;
  };
}

// ============================================================================
// ANEXO
// ============================================================================

export interface ProjetoAnexo {
  id: number;
  projetoId: number;
  nomeArquivo: string;
  caminhoArquivo: string;
  tipoArquivo: string;
  tamanhoBytes: number;
  descricao: string | null;
  uploadPorId: number;
  criadoEm: Date;
}

export interface ProjetoAnexoWithRelations extends ProjetoAnexo {
  projeto?: Pick<Projeto, 'id' | 'numeroProjeto' | 'titulo'>;
  uploadPor: {
    id: number;
    nome: string;
    email: string;
  };
}

// ============================================================================
// HISTÓRICO
// ============================================================================

export interface ProjetoHistorico {
  id: number;
  projetoId: number;
  usuarioId: number;
  acao: string;
  detalhes: any; // Json
  criadoEm: Date;
}

export interface ProjetoHistoricoWithRelations extends ProjetoHistorico {
  projeto?: Pick<Projeto, 'id' | 'numeroProjeto' | 'titulo'>;
  usuario: {
    id: number;
    nome: string;
    email: string;
  };
}

// ============================================================================
// ENUMS E CONSTANTES
// ============================================================================

export const PROJETO_STATUS = {
  PLANEJADO: 'planejado' as Projeto_status,
  EM_EXECUCAO: 'em_execucao' as Projeto_status,
  EM_INSPECAO: 'em_inspecao' as Projeto_status,
  AGUARDANDO_DEVOLUCOES: 'aguardando_devolucoes' as Projeto_status,
  CONCLUIDO: 'concluido' as Projeto_status,
  ARQUIVADO: 'arquivado' as Projeto_status,
  SUSPENSO: 'suspenso' as Projeto_status,
  CANCELADO: 'cancelado' as Projeto_status,
} as const;

export const PROJETO_PRIORIDADE = {
  BAIXA: 'baixa' as Projeto_prioridade,
  MEDIA: 'media' as Projeto_prioridade,
  ALTA: 'alta' as Projeto_prioridade,
  CRITICA: 'critica' as Projeto_prioridade,
} as const;

export const ETAPA_STATUS = {
  PENDENTE: 'pendente' as ProjetoEtapa_status,
  EM_ANDAMENTO: 'em_andamento' as ProjetoEtapa_status,
  EM_VALIDACAO: 'em_validacao' as ProjetoEtapa_status,
  CONCLUIDA: 'concluida' as ProjetoEtapa_status,
  BLOQUEADA: 'bloqueada' as ProjetoEtapa_status,
  CANCELADA: 'cancelada' as ProjetoEtapa_status,
} as const;

export const MATERIAL_STATUS = {
  PLANEJADO: 'planejado' as ProjetoMaterial_status,
  LIBERADO: 'liberado' as ProjetoMaterial_status,
  EM_USO: 'em_uso' as ProjetoMaterial_status,
  DEVOLUCAO_PENDENTE: 'devolucao_pendente' as ProjetoMaterial_status,
  TRIAGEM_PENDENTE: 'triagem_pendente' as ProjetoMaterial_status,
  FINALIZADO: 'finalizado' as ProjetoMaterial_status,
} as const;

export const TAREFA_STATUS = {
  ABERTA: 'aberta' as ProjetoTarefa_status,
  EM_ANDAMENTO: 'em_andamento' as ProjetoTarefa_status,
  BLOQUEADA: 'bloqueada' as ProjetoTarefa_status,
  CONCLUIDA: 'concluida' as ProjetoTarefa_status,
  CANCELADA: 'cancelada' as ProjetoTarefa_status,
} as const;

// ============================================================================
// TRANSIÇÕES DE STATUS PERMITIDAS
// ============================================================================

export const TRANSICOES_STATUS_PROJETO: Record<Projeto_status, Projeto_status[]> = {
  planejado: ['em_execucao', 'suspenso', 'cancelado'],
  em_execucao: ['em_inspecao', 'suspenso', 'cancelado'],
  em_inspecao: ['aguardando_devolucoes', 'concluido', 'em_execucao'],
  aguardando_devolucoes: ['concluido', 'em_execucao'],
  concluido: ['arquivado'],
  arquivado: [],
  suspenso: ['planejado', 'em_execucao', 'cancelado'],
  cancelado: [],
};

export const TRANSICOES_STATUS_ETAPA: Record<ProjetoEtapa_status, ProjetoEtapa_status[]> = {
  pendente: ['em_andamento', 'bloqueada', 'cancelada'],
  em_andamento: ['em_validacao', 'bloqueada', 'cancelada'],
  em_validacao: ['concluida', 'em_andamento'],
  concluida: [],
  bloqueada: ['pendente', 'em_andamento'],
  cancelada: [],
};

export const TRANSICOES_STATUS_MATERIAL: Record<ProjetoMaterial_status, ProjetoMaterial_status[]> = {
  planejado: ['liberado', 'finalizado'],
  liberado: ['em_uso'],
  em_uso: ['devolucao_pendente'],
  devolucao_pendente: ['triagem_pendente'],
  triagem_pendente: ['finalizado', 'em_uso'],
  finalizado: [],
};

export const TRANSICOES_STATUS_TAREFA: Record<ProjetoTarefa_status, ProjetoTarefa_status[]> = {
  aberta: ['em_andamento', 'bloqueada', 'cancelada'],
  em_andamento: ['concluida', 'bloqueada', 'cancelada'],
  bloqueada: ['aberta', 'em_andamento', 'cancelada'],
  concluida: [],
  cancelada: [],
};

// ============================================================================
// TIPOS DE AÇÃO PARA HISTÓRICO
// ============================================================================

export const ACAO_HISTORICO = {
  CRIACAO: 'projeto.criado',
  ATUALIZACAO: 'projeto.atualizado',
  STATUS_ALTERADO: 'projeto.status_alterado',
  RESPONSAVEL_ALTERADO: 'projeto.responsavel_alterado',
  ETAPA_CRIADA: 'etapa.criada',
  ETAPA_ATUALIZADA: 'etapa.atualizada',
  MATERIAL_ALOCADO: 'material.alocado',
  MATERIAL_DEVOLVIDO: 'material.devolvido',
  TAREFA_CRIADA: 'tarefa.criada',
  TAREFA_CONCLUIDA: 'tarefa.concluida',
  ANEXO_ADICIONADO: 'anexo.adicionado',
  ANEXO_REMOVIDO: 'anexo.removido',
} as const;

export type AcaoHistorico = typeof ACAO_HISTORICO[keyof typeof ACAO_HISTORICO];
