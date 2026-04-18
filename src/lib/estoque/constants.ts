/**
 * CONSTANTES - Módulo Estoque
 * 
 * Labels, opções, configurações e constantes do sistema
 */

// ============================================================================
// TIPOS DE CATEGORIA
// ============================================================================

export const CATEGORIA_TIPO_LABELS: Record<string, string> = {
  MATERIAL: 'Material',
  EQUIPAMENTO: 'Equipamento',
  AMBOS: 'Ambos'
};

// ============================================================================
// TIPOS DE LOCALIZAÇÃO
// ============================================================================

export const LOCALIZACAO_TIPO_LABELS: Record<string, string> = {
  DEPOSITO: 'Depósito',
  PRATELEIRA: 'Prateleira',
  CORREDOR: 'Corredor',
  SETOR: 'Setor',
  CONTAINER: 'Container',
  VEICULO: 'Veículo',
  OBRA: 'Obra',
  OUTRO: 'Outro'
};

// ============================================================================
// TIPOS DE DOCUMENTO (FORNECEDOR)
// ============================================================================

export const FORNECEDOR_TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  OUTRO: 'Outro'
};

// ============================================================================
// TIPOS DE MOVIMENTAÇÃO
// ============================================================================

export const MOVIMENTACAO_TIPO_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  TRANSFERENCIA: 'Transferência',
  AJUSTE_POSITIVO: 'Ajuste Positivo',
  AJUSTE_NEGATIVO: 'Ajuste Negativo',
  RESERVA: 'Reserva',
  CANCELAMENTO_RESERVA: 'Cancelamento de Reserva',
  DEVOLUCAO: 'Devolução',
  PERDA: 'Perda'
};

export const MOVIMENTACAO_TIPO_COLORS: Record<string, string> = {
  ENTRADA: 'text-green-600 bg-green-50 border-green-200',
  SAIDA: 'text-red-600 bg-red-50 border-red-200',
  TRANSFERENCIA: 'text-blue-600 bg-blue-50 border-blue-200',
  AJUSTE_POSITIVO: 'text-green-600 bg-green-50 border-green-200',
  AJUSTE_NEGATIVO: 'text-orange-600 bg-orange-50 border-orange-200',
  RESERVA: 'text-purple-600 bg-purple-50 border-purple-200',
  CANCELAMENTO_RESERVA: 'text-gray-600 bg-gray-50 border-gray-200',
  DEVOLUCAO: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  PERDA: 'text-red-700 bg-red-100 border-red-300'
};

// ============================================================================
// TIPOS DE EQUIPAMENTO
// ============================================================================

export const EQUIPAMENTO_TIPO_LABELS: Record<string, string> = {
  MEDICAO: 'Medição',
  PERFURACAO: 'Perfuração',
  CORTE: 'Corte',
  FIXACAO: 'Fixação',
  TESTE: 'Teste',
  SEGURANCA: 'Segurança',
  TRANSPORTE: 'Transporte',
  COMUNICACAO: 'Comunicação',
  OUTRO: 'Outro'
};

// ============================================================================
// STATUS DE EQUIPAMENTO
// ============================================================================

export const EQUIPAMENTO_STATUS_LABELS: Record<string, string> = {
  DISPONIVEL: 'Disponível',
  EM_USO: 'Em Uso',
  EM_MANUTENCAO: 'Em Manutenção',
  CALIBRACAO_VENCIDA: 'Calibração Vencida',
  INATIVO: 'Inativo',
  DESCARTADO: 'Descartado'
};

export const EQUIPAMENTO_STATUS_COLORS: Record<string, string> = {
  DISPONIVEL: 'text-green-700 bg-green-100 border-green-300',
  EM_USO: 'text-blue-700 bg-blue-100 border-blue-300',
  EM_MANUTENCAO: 'text-orange-700 bg-orange-100 border-orange-300',
  CALIBRACAO_VENCIDA: 'text-red-700 bg-red-100 border-red-300',
  INATIVO: 'text-gray-700 bg-gray-100 border-gray-300',
  DESCARTADO: 'text-gray-600 bg-gray-50 border-gray-200'
};

// ============================================================================
// STATUS DE ALOCAÇÃO DE EQUIPAMENTO
// ============================================================================

export const PROJETO_EQUIPAMENTO_STATUS_LABELS: Record<string, string> = {
  ALOCADO: 'Alocado',
  DEVOLVIDO: 'Devolvido',
  ATRASADO: 'Atrasado',
  EM_MANUTENCAO: 'Em Manutenção'
};

export const PROJETO_EQUIPAMENTO_STATUS_COLORS: Record<string, string> = {
  ALOCADO: 'text-blue-700 bg-blue-100 border-blue-300',
  DEVOLVIDO: 'text-green-700 bg-green-100 border-green-300',
  ATRASADO: 'text-red-700 bg-red-100 border-red-300',
  EM_MANUTENCAO: 'text-orange-700 bg-orange-100 border-orange-300'
};

// ============================================================================
// CONDIÇÃO DE EQUIPAMENTO
// ============================================================================

export const EQUIPAMENTO_CONDICAO_LABELS: Record<string, string> = {
  EXCELENTE: 'Excelente',
  BOM: 'Bom',
  REGULAR: 'Regular',
  RUIM: 'Ruim'
};

export const EQUIPAMENTO_CONDICAO_COLORS: Record<string, string> = {
  EXCELENTE: 'text-green-700 bg-green-100',
  BOM: 'text-blue-700 bg-blue-100',
  REGULAR: 'text-yellow-700 bg-yellow-100',
  RUIM: 'text-red-700 bg-red-100'
};

// ============================================================================
// TIPOS DE MANUTENÇÃO
// ============================================================================

export const MANUTENCAO_TIPO_LABELS: Record<string, string> = {
  PREVENTIVA: 'Preventiva',
  CORRETIVA: 'Corretiva',
  CALIBRACAO: 'Calibração',
  INSPECAO: 'Inspeção'
};

export const MANUTENCAO_TIPO_COLORS: Record<string, string> = {
  PREVENTIVA: 'text-blue-600 bg-blue-50',
  CORRETIVA: 'text-orange-600 bg-orange-50',
  CALIBRACAO: 'text-purple-600 bg-purple-50',
  INSPECAO: 'text-gray-600 bg-gray-50'
};

// ============================================================================
// TIPOS DE ALERTA
// ============================================================================

export const ALERTA_TIPO_LABELS: Record<string, string> = {
  ESTOQUE_MINIMO: 'Estoque Mínimo',
  PONTO_REPOSICAO: 'Ponto de Reposição',
  LOTE_VENCIDO: 'Lote Vencido',
  LOTE_PROXIMO_VENCIMENTO: 'Lote Próximo ao Vencimento',
  CALIBRACAO_VENCIDA: 'Calibração Vencida',
  CALIBRACAO_PROXIMA: 'Calibração Próxima',
  MANUTENCAO_VENCIDA: 'Manutenção Vencida',
  MANUTENCAO_PROXIMA: 'Manutenção Próxima',
  EQUIPAMENTO_NAO_DEVOLVIDO: 'Equipamento Não Devolvido',
  EQUIPAMENTO_CONDICAO_RUIM: 'Equipamento em Condição Ruim'
};

// ============================================================================
// PRIORIDADE DE ALERTA
// ============================================================================

export const ALERTA_PRIORIDADE_LABELS: Record<string, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica'
};

export const ALERTA_PRIORIDADE_COLORS: Record<string, string> = {
  BAIXA: 'text-gray-700 bg-gray-100 border-gray-300',
  MEDIA: 'text-yellow-700 bg-yellow-100 border-yellow-300',
  ALTA: 'text-orange-700 bg-orange-100 border-orange-300',
  CRITICA: 'text-red-700 bg-red-100 border-red-300'
};

export const ALERTA_PRIORIDADE_ICONS: Record<string, string> = {
  BAIXA: '🔵',
  MEDIA: '🟡',
  ALTA: '🟠',
  CRITICA: '🔴'
};

// ============================================================================
// TIPOS DE COMPRA
// ============================================================================

export const COMPRA_TIPO_LABELS: Record<string, string> = {
  MATERIAL: 'Material',
  EQUIPAMENTO: 'Equipamento',
  MISTO: 'Misto'
};

// ============================================================================
// STATUS DE COMPRA
// ============================================================================

export const COMPRA_STATUS_LABELS: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  PEDIDO: 'Pedido',
  EM_TRANSITO: 'Em Trânsito',
  RECEBIDO_PARCIAL: 'Recebido Parcial',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado'
};

export const COMPRA_STATUS_COLORS: Record<string, string> = {
  ORCAMENTO: 'text-gray-600 bg-gray-50 border-gray-200',
  PEDIDO: 'text-blue-600 bg-blue-50 border-blue-200',
  EM_TRANSITO: 'text-purple-600 bg-purple-50 border-purple-200',
  RECEBIDO_PARCIAL: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  RECEBIDO: 'text-green-600 bg-green-50 border-green-200',
  CANCELADO: 'text-red-600 bg-red-50 border-red-200'
};

// ============================================================================
// UNIDADES COMUNS
// ============================================================================

export const UNIDADES_COMUNS = [
  { sigla: 'UN', nome: 'Unidade' },
  { sigla: 'M', nome: 'Metro' },
  { sigla: 'M2', nome: 'Metro Quadrado' },
  { sigla: 'M3', nome: 'Metro Cúbico' },
  { sigla: 'KG', nome: 'Quilograma' },
  { sigla: 'L', nome: 'Litro' },
  { sigla: 'CX', nome: 'Caixa' },
  { sigla: 'PCT', nome: 'Pacote' },
  { sigla: 'ROLO', nome: 'Rolo' },
  { sigla: 'BARRA', nome: 'Barra' },
  { sigla: 'PC', nome: 'Peça' },
  { sigla: 'JG', nome: 'Jogo' },
  { sigla: 'PAR', nome: 'Par' },
  { sigla: 'KIT', nome: 'Kit' },
  { sigla: 'SC', nome: 'Saco' }
];

// ============================================================================
// CONFIGURAÇÕES DE ALERTA
// ============================================================================

export const ALERTA_CONFIG = {
  DIAS_VENCIMENTO_LOTE: 30, // Alerta 30 dias antes do vencimento
  DIAS_CALIBRACAO: 15, // Alerta 15 dias antes da calibração
  DIAS_MANUTENCAO: 7, // Alerta 7 dias antes da manutenção
  DIAS_ATRASO_DEVOLUCAO: 3 // Alerta após 3 dias de atraso
};

// ============================================================================
// PAGINAÇÃO
// ============================================================================

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// ============================================================================
// PERMISSÕES (para integração futura)
// ============================================================================

export const ESTOQUE_PERMISSIONS = {
  // Materiais
  MATERIAIS_VIEW: 'estoque:materiais:view',
  MATERIAIS_CREATE: 'estoque:materiais:create',
  MATERIAIS_EDIT: 'estoque:materiais:edit',
  MATERIAIS_DELETE: 'estoque:materiais:delete',
  
  // Movimentações
  MOVIMENTACOES_VIEW: 'estoque:movimentacoes:view',
  MOVIMENTACOES_CREATE: 'estoque:movimentacoes:create',
  
  // Equipamentos
  EQUIPAMENTOS_VIEW: 'estoque:equipamentos:view',
  EQUIPAMENTOS_CREATE: 'estoque:equipamentos:create',
  EQUIPAMENTOS_EDIT: 'estoque:equipamentos:edit',
  EQUIPAMENTOS_DELETE: 'estoque:equipamentos:delete',
  EQUIPAMENTOS_ALOCAR: 'estoque:equipamentos:alocar',
  EQUIPAMENTOS_DEVOLVER: 'estoque:equipamentos:devolver',
  
  // Manutenção
  MANUTENCAO_VIEW: 'estoque:manutencao:view',
  MANUTENCAO_CREATE: 'estoque:manutencao:create',
  MANUTENCAO_EDIT: 'estoque:manutencao:edit',
  
  // Compras
  COMPRAS_VIEW: 'estoque:compras:view',
  COMPRAS_CREATE: 'estoque:compras:create',
  COMPRAS_EDIT: 'estoque:compras:edit',
  COMPRAS_APPROVE: 'estoque:compras:approve',
  
  // Alertas
  ALERTAS_VIEW: 'estoque:alertas:view',
  ALERTAS_RESOLVE: 'estoque:alertas:resolve',
  
  // Relatórios
  RELATORIOS_VIEW: 'estoque:relatorios:view',
  RELATORIOS_EXPORT: 'estoque:relatorios:export',
};
