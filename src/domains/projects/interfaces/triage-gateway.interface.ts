/**
 * Interfaces para Sistema de Triagem
 * Fase 6: Gatilhos de Triagem
 * 
 * Define contratos para futura integração com módulo de triagem de materiais/equipamentos
 */

/**
 * Tipos de triagem disponíveis no sistema
 */
export type TipoTriagem = 
  | 'MATERIAL'      // Triagem de materiais
  | 'EQUIPAMENTO'   // Triagem de equipamentos
  | 'FERRAMENTA'    // Triagem de ferramentas
  | 'INSPECAO';     // Inspeção geral

/**
 * Status de uma triagem
 */
export type StatusTriagem =
  | 'PENDENTE'      // Aguardando início
  | 'EM_ANDAMENTO'  // Em processo de triagem
  | 'CONCLUIDA'     // Triagem finalizada
  | 'CANCELADA';    // Triagem cancelada

/**
 * Prioridade da triagem
 */
export type PrioridadeTriagem =
  | 'BAIXA'
  | 'MEDIA'
  | 'ALTA'
  | 'URGENTE';

/**
 * DTO para solicitar abertura de triagem
 */
export interface AbrirTriagemDTO {
  /** ID do projeto relacionado */
  projetoId: number;
  /** Tipo de triagem a ser realizada */
  tipo: TipoTriagem;
  /** ID do material/equipamento (se aplicável) */
  itemId?: number;
  /** Prioridade da triagem */
  prioridade: PrioridadeTriagem;
  /** Motivo/observações sobre a triagem */
  motivo: string;
  /** ID do usuário solicitante */
  usuarioId: number;
  /** Prazo estimado para conclusão (em dias) */
  prazoEstimadoDias?: number;
}

/**
 * DTO para fechar/concluir triagem
 */
export interface FecharTriagemDTO {
  /** ID da triagem */
  triagemId: string;
  /** ID do usuário que concluiu */
  usuarioId: number;
  /** Resultado da triagem */
  resultado: string;
  /** Observações finais */
  observacoes?: string;
  /** Ações corretivas necessárias (se houver) */
  acoesCorretivas?: string[];
}

/**
 * Representação de uma triagem
 */
export interface Triagem {
  /** ID único da triagem no sistema externo */
  id: string;
  /** ID do projeto relacionado */
  projetoId: number;
  /** Tipo de triagem */
  tipo: TipoTriagem;
  /** Status atual */
  status: StatusTriagem;
  /** Prioridade */
  prioridade: PrioridadeTriagem;
  /** Motivo da triagem */
  motivo: string;
  /** ID do material/equipamento relacionado */
  itemId?: number;
  /** Nome do item */
  itemNome?: string;
  /** Código do item */
  itemCodigo?: string;
  /** ID do usuário solicitante */
  usuarioSolicitanteId: number;
  /** ID do usuário responsável */
  usuarioResponsavelId?: number;
  /** Data/hora de abertura */
  aberturaEm: Date;
  /** Data/hora de conclusão */
  conclusaoEm?: Date;
  /** Resultado da triagem (se concluída) */
  resultado?: string;
  /** Observações */
  observacoes?: string;
  /** Ações corretivas */
  acoesCorretivas?: string[];
  /** Prazo estimado */
  prazoEstimado?: Date;
}

/**
 * Filtros para listar triagens
 */
export interface ListarTriagensDTO {
  /** Filtrar por projeto */
  projetoId?: number;
  /** Filtrar por tipo */
  tipo?: TipoTriagem;
  /** Filtrar por status */
  status?: StatusTriagem;
  /** Filtrar por prioridade */
  prioridade?: PrioridadeTriagem;
  /** Data inicial */
  dataInicio?: Date;
  /** Data final */
  dataFim?: Date;
  /** Apenas triagens em atraso */
  apenasEmAtraso?: boolean;
  /** Página */
  pagina?: number;
  /** Limite por página */
  limite?: number;
}

/**
 * Resposta paginada de triagens
 */
export interface ListarTriagensResponse {
  data: Triagem[];
  paginacao: {
    paginaAtual: number;
    totalPaginas: number;
    totalItens: number;
    itensPorPagina: number;
  };
}

/**
 * Resposta de operação de triagem
 */
export interface RespostaTriagem {
  /** Sucesso da operação */
  sucesso: boolean;
  /** ID da triagem (se criada/atualizada) */
  triagemId?: string;
  /** Mensagem descritiva */
  mensagem: string;
  /** Detalhes adicionais */
  detalhes?: Record<string, any>;
}

/**
 * Estatísticas de triagens de um projeto
 */
export interface EstatisticasTriagem {
  /** Total de triagens */
  total: number;
  /** Triagens pendentes */
  pendentes: number;
  /** Triagens em andamento */
  emAndamento: number;
  /** Triagens concluídas */
  concluidas: number;
  /** Triagens canceladas */
  canceladas: number;
  /** Triagens em atraso */
  emAtraso: number;
  /** Tempo médio de conclusão (em horas) */
  tempoMedioConclusao?: number;
}

/**
 * Gateway para integração com sistema de triagem
 * 
 * Esta interface define o contrato que será implementado pelo módulo de triagem futuro.
 * Por enquanto, usaremos uma implementação mockada que simula as operações.
 */
export interface ITriageGateway {
  /**
   * Solicita abertura de uma nova triagem
   * @param dados Dados da triagem a ser aberta
   * @returns Resposta com sucesso/falha e ID da triagem
   */
  abrirTriagem(dados: AbrirTriagemDTO): Promise<RespostaTriagem>;

  /**
   * Fecha/conclui uma triagem existente
   * @param dados Dados para fechamento da triagem
   * @returns Resposta com sucesso/falha
   */
  fecharTriagem(dados: FecharTriagemDTO): Promise<RespostaTriagem>;

  /**
   * Lista triagens com filtros
   * @param filtros Filtros para busca
   * @returns Lista paginada de triagens
   */
  listarTriagens(filtros: ListarTriagensDTO): Promise<ListarTriagensResponse>;

  /**
   * Busca triagens pendentes de um projeto
   * @param projetoId ID do projeto
   * @returns Lista de triagens pendentes/em andamento
   */
  buscarTriagensPendentes(projetoId: number): Promise<Triagem[]>;

  /**
   * Busca estatísticas de triagens de um projeto
   * @param projetoId ID do projeto
   * @returns Estatísticas consolidadas
   */
  obterEstatisticas(projetoId: number): Promise<EstatisticasTriagem>;

  /**
   * Verifica se há triagens bloqueando conclusão do projeto
   * @param projetoId ID do projeto
   * @returns true se houver triagens pendentes/em andamento
   */
  verificarBloqueio(projetoId: number): Promise<boolean>;

  /**
   * Verifica conexão com sistema de triagem
   * @returns true se conectado, false caso contrário
   */
  verificarConexao(): Promise<boolean>;
}
