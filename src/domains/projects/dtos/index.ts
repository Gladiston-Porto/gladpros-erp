/**
 * DTOs (Data Transfer Objects) do módulo Projetos
 * Definem a estrutura de dados para entrada/saída das APIs
 */

import type {
  Projeto_status,
  Projeto_prioridade,
  ProjetoEtapa_status,
  ProjetoMaterial_status,
  ProjetoTarefa_status,
} from "../entities";

// ============================================================================
// PROJETO - DTOs
// ============================================================================

export interface CreateProjetoDTO {
  titulo: string;
  descricao?: string | null;
  clienteId: number;
  propostaId?: number | null;
  responsavelId?: number | null;
  prioridade?: Projeto_prioridade;
  dataInicio?: Date | string | null;
  dataPrevisao?: Date | string | null;
  valorOrcado?: number | null;
  observacoes?: string | null;
}

export interface UpdateProjetoDTO {
  titulo?: string;
  descricao?: string | null;
  responsavelId?: number | null;
  prioridade?: Projeto_prioridade;
  dataInicio?: Date | string | null;
  dataPrevisao?: Date | string | null;
  dataConclusao?: Date | string | null;
  valorOrcado?: number | null;
  valorRealizado?: number | null;
  observacoes?: string | null;
  budgetBaseline?: any;
  baselineLockedAt?: Date | string | null;
  baselineLockedBy?: number | null;
}

export interface AlterarStatusProjetoDTO {
  novoStatus: Projeto_status;
  observacao?: string;
}

export interface ListarProjetosDTO {
  clienteId?: number;
  responsavelId?: number;
  status?: Projeto_status | Projeto_status[];
  prioridade?: Projeto_prioridade | Projeto_prioridade[];
  dataInicioMin?: Date | string;
  dataInicioMax?: Date | string;
  dataPrevisaoMin?: Date | string;
  dataPrevisaoMax?: Date | string;
  busca?: string; // Busca por título/descrição
  ordenarPor?: 'dataInicio' | 'dataPrevisao' | 'prioridade' | 'status' | 'titulo';
  ordenarDirecao?: 'asc' | 'desc';
  pagina?: number;
  limite?: number;
}

export interface ProjetoResponseDTO {
  id: number;
  numeroProjeto: string;
  titulo: string;
  descricao: string | null;
  status: Projeto_status;
  prioridade: Projeto_prioridade;
  clienteId: number;
  clienteNome?: string;
  propostaId: number | null;
  propostaNumero?: string;
  responsavelId: number | null;
  responsavelNome?: string;
  dataInicio: Date | null;
  dataPrevisao: Date | null;
  dataConclusao: Date | null;
  valorOrcado: number | null;
  valorRealizado: number | null;
  observacoes: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPorId: number;
  criadoPorNome?: string;
  // Contadores
  totalEtapas?: number;
  etapasConcluidas?: number;
  totalTarefas?: number;
  tarefasConcluidas?: number;
  totalMateriais?: number;
  totalAnexos?: number;
}

// ============================================================================
// ETAPA - DTOs
// ============================================================================

export interface CreateProjetoEtapaDTO {
  projetoId: number;
  ordem: number;
  servico: string;
  descricao?: string | null;
  inicioPrevisto?: Date | string | null;
  fimPrevisto?: Date | string | null;
}

export interface UpdateProjetoEtapaDTO {
  ordem?: number;
  servico?: string;
  descricao?: string | null;
  inicioPrevisto?: Date | string | null;
  fimPrevisto?: Date | string | null;
  fimReal?: Date | string | null;
  porcentagem?: number;
}

export interface AlterarStatusEtapaDTO {
  novoStatus: ProjetoEtapa_status;
  observacao?: string;
}

export interface ProjetoEtapaResponseDTO {
  id: number;
  projetoId: number;
  projetoNumeroProjeto?: string;
  projetoTitulo?: string;
  ordem: number;
  servico: string;
  descricao: string | null;
  status: ProjetoEtapa_status;
  inicioPrevisto: Date | null;
  fimPrevisto: Date | null;
  fimReal: Date | null;
  porcentagem: number;
  criadoEm: Date;
  atualizadoEm: Date;
  // Contadores
  totalTarefas?: number;
  tarefasConcluidas?: number;
}

// ============================================================================
// MATERIAL - DTOs
// ============================================================================

export interface CreateProjetoMaterialDTO {
  projetoId: number;
  nome: string;
  quantidadePlanejada: number;
  unidade: string;
}

export interface UpdateProjetoMaterialDTO {
  nome?: string;
  quantidadePlanejada?: number;
  unidade?: string;
}

export interface AlterarStatusMaterialDTO {
  novoStatus: ProjetoMaterial_status;
  observacao?: string;
}

export interface ProjetoMaterialResponseDTO {
  id: number;
  projetoId: number;
  projetoNumeroProjeto?: string;
  projetoTitulo?: string;
  nome: string;
  quantidadePlanejada: number;
  unidade: string;
  status: ProjetoMaterial_status;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================================================
// TAREFA - DTOs
// ============================================================================

export interface CreateProjetoTarefaDTO {
  projetoId: number;
  etapaId?: number | null;
  titulo: string;
  descricao?: string | null;
  prioridade?: Projeto_prioridade;
  atribuidaPara?: number | null;
  prazo?: Date | string | null;
}

export interface UpdateProjetoTarefaDTO {
  etapaId?: number | null;
  titulo?: string;
  descricao?: string | null;
  prioridade?: Projeto_prioridade;
  atribuidaPara?: number | null;
  prazo?: Date | string | null;
}

export interface AlterarStatusTarefaDTO {
  novoStatus: ProjetoTarefa_status;
  observacao?: string;
}

export interface ProjetoTarefaResponseDTO {
  id: number;
  projetoId: number;
  projetoNumeroProjeto?: string;
  projetoTitulo?: string;
  etapaId: number | null;
  etapaServico?: string;
  titulo: string;
  descricao: string | null;
  status: ProjetoTarefa_status;
  prioridade: Projeto_prioridade;
  atribuidaPara: number | null;
  responsavelNome?: string;
  prazo: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================================================
// ANEXO - DTOs
// ============================================================================

export interface CreateProjetoAnexoDTO {
  projetoId: number;
  arquivoUrl: string;
  rotulo?: string | null;
  publicoCliente?: boolean;
}

export interface ProjetoAnexoResponseDTO {
  id: number;
  projetoId: number;
  projetoNumeroProjeto?: string;
  projetoTitulo?: string;
  arquivoUrl: string;
  rotulo: string | null;
  publicoCliente: boolean;
  criadoPorId: number;
  criadoPorNome?: string;
  criadoEm: Date;
}

// ============================================================================
// HISTÓRICO - DTOs
// ============================================================================

export interface CreateProjetoHistoricoDTO {
  projetoId: number;
  acao: string;
  descricao?: string | null;
  metadados?: Record<string, any>;
}

export interface ListarHistoricoDTO {
  projetoId: number;
  acoes?: string[];
  usuarioId?: number;
  dataInicio?: Date | string;
  dataFim?: Date | string;
  pagina?: number;
  limite?: number;
}

export interface ProjetoHistoricoResponseDTO {
  id: number;
  projetoId: number;
  projetoNumeroProjeto?: string;
  projetoTitulo?: string;
  acao: string;
  acaoLabel?: string; // Label legível para exibição
  detalhes: any;
  usuarioId: number;
  usuarioNome?: string;
  criadoEm: Date;
}

// ============================================================================
// DASHBOARD - DTOs
// ============================================================================

export interface DashboardProjetosDTO {
  totalProjetos: number;
  porStatus: Record<Projeto_status, number>;
  porPrioridade: Record<Projeto_prioridade, number>;
  projetosAtrasados: number;
  tarefasPendentes: number;
  materiaisPendentes: number;
  projetosProximosVencimento: ProjetoResponseDTO[];
}

// ============================================================================
// UTILIDADES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  paginacao: {
    paginaAtual: number;
    porPagina: number;
    totalItens: number;
    totalPaginas: number;
    temProxima: boolean;
    temAnterior: boolean;
  };
}

export type ProjetoResponsePaginated = PaginatedResponse<ProjetoResponseDTO>;
export type ProjetoEtapaResponsePaginated = PaginatedResponse<ProjetoEtapaResponseDTO>;
export type ProjetoTarefaResponsePaginated = PaginatedResponse<ProjetoTarefaResponseDTO>;
export type ProjetoMaterialResponsePaginated = PaginatedResponse<ProjetoMaterialResponseDTO>;
export type ProjetoAnexoResponsePaginated = PaginatedResponse<ProjetoAnexoResponseDTO>;
export type ProjetoHistoricoResponsePaginated = PaginatedResponse<ProjetoHistoricoResponseDTO>;
