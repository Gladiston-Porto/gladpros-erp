/**
 * Types e Interfaces do módulo de Projetos
 */

import type {
  ProjetoStatus,
  ProjetoPrioridade,
  EtapaStatus,
  TarefaStatus,
  TarefaPrioridade,
  MaterialStatus,
  MovimentacaoTipo,
} from './constants';

// Projeto
export interface Projeto {
  id: number;
  propostaId: number | null;
  clienteId: number;
  numeroProjeto: string;
  titulo: string;
  descricao: string | null;
  status: ProjetoStatus;
  dataInicioPrevista: string | null;
  dataInicioReal: string | null;
  dataConclusaoPrevista: string | null;
  dataConclusaoReal: string | null;
  valorEstimado: number | null;
  custoPrevisto: number | null;
  custoReal: number | null;
  margemPrevista: number | null;
  margemReal: number | null;
  lucroPrevisto: number | null;
  lucroReal: number | null;
  responsavelId: number | null;
  prioridade: ProjetoPrioridade;
  localidade: string | null;
  endereco: string | null;
  criadoPor: number;
  atualizadoPor: number | null;
  criadoEm: string;
  atualizadoEm: string | null;
  
  // Relações (quando incluídas)
  Cliente?: {
    id: number;
    nomeCompleto: string | null;
    razaoSocial: string | null;
    tipo: 'PF' | 'PJ';
  };
  Responsavel?: {
    id: number;
    nome: string;
    email: string;
  };
  Proposta?: {
    id: number;
    numero: string;
    titulo: string;
  };
  CriadoPor?: {
    id: number;
    nome: string;
  };
  Etapas?: ProjetoEtapa[];
  Tarefas?: ProjetoTarefa[];
  Materiais?: ProjetoMaterial[];
  _count?: {
    Etapas: number;
    Tarefas: number;
    Materiais: number;
    Anexos: number;
  };
}

// Projeto Input (para criação/edição)
export interface ProjetoInput {
  propostaId?: number | null;
  clienteId: number;
  titulo: string;
  descricao?: string;
  status?: ProjetoStatus;
  dataInicioPrevista?: string;
  dataInicioReal?: string;
  dataConclusaoPrevista?: string;
  dataConclusaoReal?: string;
  valorEstimado?: number;
  custoPrevisto?: number;
  custoReal?: number;
  margemPrevista?: number;
  margemReal?: number;
  lucroPrevisto?: number;
  lucroReal?: number;
  responsavelId?: number;
  prioridade?: ProjetoPrioridade;
  localidade?: string;
  endereco?: string;
}

// Etapa - CAMPOS CORRETOS DO SCHEMA PRISMA
export interface ProjetoEtapa {
  id: number;
  projetoId: number;
  servico: string; // CORRETO: 'servico' não 'nome'
  descricao: string | null;
  ordem: number;
  status: EtapaStatus;
  inicioPrevisto: string | null; // CORRETO: 'inicioPrevisto' não 'dataInicioPrevista'
  inicioReal: string | null; // CORRETO: 'inicioReal' não 'dataInicioReal'
  fimPrevisto: string | null; // CORRETO: 'fimPrevisto' não 'dataConclusaoPrevista'
  fimReal: string | null; // CORRETO: 'fimReal' não 'dataConclusaoReal'
  porcentagem: number; // CORRETO: 'porcentagem' não 'percentualConclusao'
  responsavelId: number | null;
  checklistItens?: Array<{ id: string; texto: string; concluido: boolean }> | null;
  criadoEm: string;
  atualizadoEm: string | null;
  
  Responsavel?: {
    id: number;
    nomeCompleto: string; // CORRETO: 'nomeCompleto' não 'nome'
  };
}

export interface EtapaInput {
  servico: string; // CORRETO: 'servico' não 'nome'
  descricao?: string;
  ordem: number;
  status?: EtapaStatus;
  inicioPrevisto?: string; // CORRETO: 'inicioPrevisto' não 'dataInicioPrevista'
  inicioReal?: string; // CORRETO: 'inicioReal' não 'dataInicioReal'
  fimPrevisto?: string; // CORRETO: 'fimPrevisto' não 'dataConclusaoPrevista'
  fimReal?: string; // CORRETO: 'fimReal' não 'dataConclusaoReal'
  porcentagem?: number; // CORRETO: 'porcentagem' não 'percentualConclusao'
  responsavelId?: number;
}

// Tarefa
export interface ProjetoTarefa {
  id: number;
  projetoId: number;
  etapaId: number | null;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  dataInicio: string | null;
  dataConclusao: string | null;
  responsavelId: number | null;
  estimativaHoras: number | null;
  horasReais: number | null;
  tags: string[];
  criadoEm: string;
  atualizadoEm: string | null;
  
  Responsavel?: {
    id: number;
    nome: string;
    email: string;
  };
  Etapa?: {
    id: number;
    nome: string;
  };
}

export interface TarefaInput {
  etapaId?: number | null;
  titulo: string;
  descricao?: string;
  status?: TarefaStatus;
  prioridade?: TarefaPrioridade;
  dataInicio?: string;
  dataConclusao?: string;
  responsavelId?: number;
  estimativaHoras?: number;
  horasReais?: number;
  tags?: string[];
}

// Material
export interface ProjetoMaterial {
  id: number;
  projetoId: number;
  materialId: number;
  quantidade: number;
  unidade: string;
  status: MaterialStatus;
  custoUnitario: number | null;
  custoTotal: number | null;
  dataReserva: string;
  dataAlocacao: string | null;
  dataDevolucao: string | null;
  observacoes: string | null;
  criadoEm: string;
  
  Material?: {
    id: number;
    nome: string;
    codigo: string;
    categoria: string;
  };
}

export interface MaterialInput {
  materialId: number;
  quantidade: number;
  unidade: string;
  custoUnitario?: number;
  observacoes?: string;
}

// Movimentação de Estoque
export interface ProjetoMovimentacao {
  id: number;
  projetoId: number;
  materialId: number;
  tipo: MovimentacaoTipo;
  quantidade: number;
  usuarioId: number;
  observacoes: string | null;
  criadoEm: string;
  
  Material?: {
    id: number;
    nome: string;
    codigo: string;
  };
  Usuario?: {
    id: number;
    nome: string;
  };
}

// Anexo
export interface ProjetoAnexo {
  id: number;
  projetoId: number;
  etapaId: number | null;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  uploadPor: number;
  criadoEm: string;
  
  UploadPor?: {
    id: number;
    nome: string;
  };
}

// Histórico
export interface ProjetoHistorico {
  id: number;
  projetoId: number;
  usuarioId: number;
  acao: string;
  detalhes: Record<string, any>;
  criadoEm: string;
  
  Usuario?: {
    id: number;
    nome: string;
  };
}

// Financeiro (resumo)
export interface ProjetoFinanceiro {
  valorEstimado: number;
  custoPrevisto: number;
  custoReal: number;
  margemPrevista: number;
  margemReal: number;
  lucroPrevisto: number;
  lucroReal: number;
  faturado: number;
  pendente: number;
  custoMateriais: number;
  custoMaoObra: number;
  despesasExtras: number;
}

// Estatísticas do Dashboard
export interface ProjetoDashboard {
  totalProjetos: number;
  projetosPorStatus: Record<ProjetoStatus, number>;
  projetosPorPrioridade: Record<ProjetoPrioridade, number>;
  totalValorEstimado: number;
  totalCustoPrevisto: number;
  totalCustoReal: number;
  margemMediaPrevista: number;
  margemMediaReal: number;
  projetosAtrasados: number;
  projetosConcluidos: number;
  projetosEmAndamento: number;
  evolucaoMensal: Array<{
    mes: string;
    iniciados: number;
    concluidos: number;
    valor: number;
  }>;
}

// Filtros
export interface ProjetoFilters {
  status?: string;
  prioridade?: string;
  clienteId?: string;
  responsavelId?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Response de lista paginada
export interface ProjetoListResponse {
  data: Projeto[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

// Tipos para Kanban
export interface KanbanColumn {
  id: TarefaStatus;
  title: string;
  tasks: ProjetoTarefa[];
}

// Tipos para Gantt
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  type: 'project' | 'task' | 'milestone';
  styles?: {
    backgroundColor?: string;
    progressColor?: string;
  };
}
