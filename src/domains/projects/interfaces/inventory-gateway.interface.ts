/**
 * Interfaces para Integração com Sistema de Estoque
 * Fase 5: Ponte Estoque
 * 
 * Estas interfaces definem o contrato para integração futura com módulo de estoque/almoxarifado.
 * Por enquanto, usaremos implementações mockadas.
 */

/**
 * Tipos de movimentação de estoque
 */
export type TipoMovimentacaoEstoque = 'LIBERACAO' | 'DEVOLUCAO' | 'AJUSTE' | 'PERDA';

/**
 * Status de processamento da integração
 */
export type StatusIntegracaoEstoque = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDA' | 'ERRO';

/**
 * Dados para solicitar liberação de material do estoque
 */
export interface LiberarMaterialDTO {
  /** ID do projeto */
  projetoId: number;
  /** ID do material no projeto */
  materialId: number;
  /** Quantidade a liberar */
  quantidade: number;
  /** ID do usuário solicitante */
  usuarioId: number;
  /** Observações sobre a liberação */
  observacao?: string;
  /** Data prevista de uso */
  dataPrevistaUso?: Date;
}

/**
 * Dados para registrar devolução de material ao estoque
 */
export interface DevolverMaterialDTO {
  /** ID do projeto */
  projetoId: number;
  /** ID do material no projeto */
  materialId: number;
  /** Quantidade a devolver */
  quantidade: number;
  /** ID do usuário que está devolvendo */
  usuarioId: number;
  /** Observações sobre a devolução */
  observacao?: string;
  /** Condição do material devolvido */
  condicao?: 'PERFEITO' | 'BOM' | 'DANIFICADO' | 'PERDIDO';
}

/**
 * Resposta da operação de integração com estoque
 */
export interface RespostaIntegracaoEstoque {
  /** Indica se a operação foi bem-sucedida */
  sucesso: boolean;
  /** ID da movimentação no sistema de estoque externo (se aplicável) */
  estoqueExternoId?: string;
  /** Mensagem descritiva do resultado */
  mensagem: string;
  /** Detalhes adicionais da operação */
  detalhes?: Record<string, any>;
  /** Quantidade efetivamente processada */
  quantidadeProcessada?: number;
  /** Data/hora do processamento */
  processadoEm?: Date;
}

/**
 * Informações sobre disponibilidade de material no estoque
 */
export interface DisponibilidadeMaterial {
  /** Código do material */
  codigoMaterial: string;
  /** Nome do material */
  nomeMaterial: string;
  /** Quantidade disponível */
  quantidadeDisponivel: number;
  /** Unidade de medida */
  unidadeMedida: string;
  /** Localização no estoque */
  localizacao?: string;
  /** Data da última atualização */
  atualizadoEm: Date;
}

/**
 * Gateway para integração com sistema de estoque/almoxarifado
 * 
 * Esta interface define o contrato que será implementado pelo módulo de estoque futuro.
 * Por enquanto, usaremos uma implementação mockada que simula as operações.
 */
export interface IInventoryGateway {
  /**
   * Solicita liberação de material do estoque para uso no projeto
   * @param dados Dados da liberação
   * @returns Resposta da operação
   */
  liberarMaterial(dados: LiberarMaterialDTO): Promise<RespostaIntegracaoEstoque>;

  /**
   * Registra devolução de material do projeto para o estoque
   * @param dados Dados da devolução
   * @returns Resposta da operação
   */
  devolverMaterial(dados: DevolverMaterialDTO): Promise<RespostaIntegracaoEstoque>;

  /**
   * Consulta disponibilidade de material no estoque
   * @param codigoMaterial Código do material
   * @returns Informações de disponibilidade
   */
  consultarDisponibilidade(codigoMaterial: string): Promise<DisponibilidadeMaterial | null>;

  /**
   * Verifica se o gateway está operacional
   * @returns true se está funcionando, false caso contrário
   */
  verificarConexao(): Promise<boolean>;
}

/**
 * Dados de uma movimentação de estoque registrada
 */
export interface MovimentacaoEstoque {
  id: number;
  projetoId: number;
  materialId: number;
  tipoMovimentacao: TipoMovimentacaoEstoque;
  quantidade: number;
  quantidadeAnterior: number;
  observacao?: string;
  usuarioId: number;
  estoqueExternoId?: string;
  statusIntegracao: StatusIntegracaoEstoque;
  erroIntegracao?: string;
  metadadosIntegracao?: Record<string, any>;
  criadoEm: Date;
  processadoEm?: Date;
}

/**
 * Filtros para listar movimentações
 */
export interface ListarMovimentacoesDTO {
  projetoId: number;
  materialId?: number;
  tipoMovimentacao?: TipoMovimentacaoEstoque;
  statusIntegracao?: StatusIntegracaoEstoque;
  dataInicio?: Date;
  dataFim?: Date;
  pagina?: number;
  limite?: number;
}

/**
 * Resposta paginada de movimentações
 */
export interface ListarMovimentacoesResponse {
  data: MovimentacaoEstoque[];
  paginacao: {
    paginaAtual: number;
    totalPaginas: number;
    totalItens: number;
    itensPorPagina: number;
  };
}
