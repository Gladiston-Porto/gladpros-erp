/**
 * Interfaces para Sistema Financeiro
 * Fase 7: Integração Financeira
 * 
 * Define contratos para futura integração com módulo financeiro
 */

/**
 * Status de um invoice
 */
export type StatusInvoice =
  | 'RASCUNHO'      // Invoice em elaboração
  | 'PENDENTE'      // Aguardando pagamento
  | 'PAGO'          // Pagamento confirmado
  | 'VENCIDO'       // Venceu sem pagamento
  | 'CANCELADO'     // Invoice cancelado
  | 'ESTORNADO';    // Pagamento estornado

/**
 * Tipo de item em um invoice
 */
export type TipoItemInvoice =
  | 'SERVICO'       // Serviço prestado
  | 'MATERIAL'      // Material fornecido
  | 'MAO_DE_OBRA'   // Mão de obra
  | 'EQUIPAMENTO'   // Aluguel de equipamento
  | 'OUTROS';       // Outros custos

/**
 * Forma de pagamento
 */
export type FormaPagamento =
  | 'BOLETO'
  | 'PIX'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'TRANSFERENCIA'
  | 'DINHEIRO'
  | 'CHEQUE';

export type TipoFaturamentoProjeto =
  | 'DEPOSIT'
  | 'PROGRESS'
  | 'MILESTONE'
  | 'MATERIALS'
  | 'SERVICE_ORDER'
  | 'FINAL';

/**
 * Item individual de um invoice
 */
export interface ItemInvoice {
  /** Descrição do item */
  descricao: string;
  /** Tipo do item */
  tipo: TipoItemInvoice;
  /** Quantidade */
  quantidade: number;
  /** Valor unitário */
  valorUnitario: number;
  /** Valor total (quantidade * valorUnitario) */
  valorTotal: number;
  /** ID de referência (material, serviço, etc) */
  referenciaId?: number;
  /** Código de referência */
  referenciaCodigo?: string;
  /** Observações do item */
  observacao?: string;
}

/**
 * DTO para gerar invoice
 */
export interface GerarInvoiceDTO {
  /** Empresa do usuário autenticado */
  empresaId: number;
  /** ID do projeto */
  projetoId: number;
  /** Tipo de faturamento do projeto */
  billingType?: TipoFaturamentoProjeto;
  /** Referência do faturamento (etapa, pay app, material, OS, etc.) */
  billingReference?: string;
  /** ID da OS quando billingType=SERVICE_ORDER */
  serviceOrderId?: number;
  /** Descrição do invoice */
  descricao: string;
  /** Data de vencimento */
  dataVencimento: Date;
  /** Forma de pagamento preferencial */
  formaPagamento?: FormaPagamento;
  /** Incluir materiais automaticamente */
  incluirMateriais?: boolean;
  /** Incluir valores da proposta */
  incluirProposta?: boolean;
  /** Itens adicionais customizados */
  itensAdicionais?: ItemInvoice[];
  /** Observações gerais */
  observacoes?: string;
  /** ID do usuário que está gerando */
  usuarioId: number;
  /** Percentual de desconto (0-100) */
  desconto?: number;
  /** Valor de desconto fixo */
  descontoFixo?: number;
}

/**
 * Representação de um invoice
 */
export interface Invoice {
  /** ID do invoice no sistema financeiro */
  id: string;
  /** Número do invoice */
  numeroInvoice: string;
  /** ID do projeto relacionado */
  projetoId: number;
  /** Número do projeto */
  numeroProjeto: string;
  /** ID do cliente */
  clienteId: number;
  /** Nome do cliente */
  clienteNome: string;
  /** CNPJ/CPF do cliente (mascarado) */
  clienteDocumento?: string;
  /** Status do invoice */
  status: StatusInvoice;
  /** Descrição */
  descricao: string;
  /** Data de emissão */
  dataEmissao: Date;
  /** Data de vencimento */
  dataVencimento: Date;
  /** Data de pagamento (se pago) */
  dataPagamento?: Date;
  /** Itens do invoice */
  itens: ItemInvoice[];
  /** Subtotal (soma dos itens) */
  subtotal: number;
  /** Desconto aplicado */
  desconto: number;
  /** Valor total (subtotal - desconto) */
  valorTotal: number;
  /** Valor pago */
  valorPago: number;
  /** Forma de pagamento */
  formaPagamento?: FormaPagamento;
  /** Observações */
  observacoes?: string;
  /** URL para visualização/pagamento */
  urlPagamento?: string;
  /** Data de criação */
  criadoEm: Date;
  /** Data de atualização */
  atualizadoEm?: Date;
}

/**
 * Resumo financeiro de um projeto
 */
export interface ResumoFinanceiroProjeto {
  /** ID do projeto */
  projetoId: number;
  /** Número do projeto */
  numeroProjeto: string;
  /** Valor total orçado (da proposta) */
  valorOrcado: number;
  /** Valor total de materiais alocados */
  valorMateriais: number;
  /** Custo total de mão de obra (service orders + timesheets) */
  valorMaoDeObra: number;
  /** Despesas diretas do projeto (excl. materiais e mão de obra) */
  valorDespesas: number;
  /** Custo real total (materiais + mão de obra + despesas) */
  custoRealTotal: number;
  /** Valor total faturado (invoices) */
  valorFaturado: number;
  /** Valor total pago */
  valorPago: number;
  /** Valor total pendente */
  valorPendente: number;
  /** Total de invoices */
  totalInvoices: number;
  /** Invoices pendentes */
  invoicesPendentes: number;
  /** Invoices pagos */
  invoicesPagos: number;
  /** Invoices vencidos */
  invoicesVencidos: number;
  /** Margem real (valorFaturado - custoRealTotal) */
  margem: number;
  /** Percentual da margem real */
  percentualMargem: number;
  /** Última atualização */
  atualizadoEm: Date;
}

/**
 * Filtros para listar invoices
 */
export interface ListarInvoicesDTO {
  /** Empresa autenticada */
  empresaId?: number;
  /** Filtrar por projeto */
  projetoId?: number;
  /** Filtrar por cliente */
  clienteId?: number;
  /** Filtrar por status */
  status?: StatusInvoice;
  /** Data inicial de emissão */
  dataEmissaoInicio?: Date;
  /** Data final de emissão */
  dataEmissaoFim?: Date;
  /** Apenas vencidos */
  apenasVencidos?: boolean;
  /** Página */
  pagina?: number;
  /** Limite por página */
  limite?: number;
}

/**
 * Resposta paginada de invoices
 */
export interface ListarInvoicesResponse {
  data: Invoice[];
  paginacao: {
    paginaAtual: number;
    totalPaginas: number;
    totalItens: number;
    itensPorPagina: number;
  };
  resumo: {
    valorTotal: number;
    valorPago: number;
    valorPendente: number;
  };
}

/**
 * DTO para registrar pagamento
 */
export interface RegistrarPagamentoDTO {
  /** ID do invoice */
  invoiceId: string;
  /** Valor pago */
  valorPago: number;
  /** Forma de pagamento */
  formaPagamento: FormaPagamento;
  /** Data do pagamento */
  dataPagamento: Date;
  /** Comprovante/referência */
  comprovante?: string;
  /** Observações */
  observacoes?: string;
  /** ID do usuário */
  usuarioId: number;
}

/**
 * Resposta de operação financeira
 */
export interface RespostaFinanceira {
  /** Sucesso da operação */
  sucesso: boolean;
  /** ID do invoice (se aplicável) */
  invoiceId?: string;
  /** Número do invoice */
  numeroInvoice?: string;
  /** Mensagem descritiva */
  mensagem: string;
  /** Detalhes adicionais */
  detalhes?: Record<string, any>;
  /** URL para ação (pagamento, visualização) */
  url?: string;
}

/**
 * Gateway para integração com sistema financeiro
 * 
 * Esta interface define o contrato que será implementado pelo módulo financeiro futuro.
 * Por enquanto, usaremos uma implementação mockada que simula as operações.
 */
export interface IFinanceGateway {
  /**
   * Gera um novo invoice para um projeto
   * @param dados Dados para geração do invoice
   * @returns Invoice gerado
   */
  gerarInvoice(dados: GerarInvoiceDTO): Promise<RespostaFinanceira>;

  /**
   * Busca um invoice por ID
   * @param invoiceId ID do invoice
   * @returns Invoice encontrado ou null
   */
  buscarInvoice(invoiceId: string): Promise<Invoice | null>;

  /**
   * Lista invoices com filtros
   * @param filtros Filtros de busca
   * @returns Lista paginada de invoices
   */
  listarInvoices(filtros: ListarInvoicesDTO): Promise<ListarInvoicesResponse>;

  /**
   * Registra pagamento de um invoice
   * @param dados Dados do pagamento
   * @returns Resposta da operação
   */
  registrarPagamento(dados: RegistrarPagamentoDTO): Promise<RespostaFinanceira>;

  /**
   * Cancela um invoice
   * @param invoiceId ID do invoice
   * @param motivo Motivo do cancelamento
   * @param usuarioId ID do usuário
   * @returns Resposta da operação
   */
  cancelarInvoice(invoiceId: string, motivo: string, usuarioId: number): Promise<RespostaFinanceira>;

  /**
   * Obtém resumo financeiro de um projeto
   * @param projetoId ID do projeto
   * @returns Resumo financeiro consolidado
   */
  obterResumoFinanceiro(projetoId: number, empresaId?: number): Promise<ResumoFinanceiroProjeto>;

  /**
   * Verifica conexão com sistema financeiro
   * @returns true se conectado, false caso contrário
   */
  verificarConexao(): Promise<boolean>;
}
