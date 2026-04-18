/**
 * Constantes - Módulo Estoque
 * Valores constantes, enums traduzidos e configurações
 */

// ============================================================================
// TIPOS DE MATERIAL
// ============================================================================

export const MATERIAL_TIPOS = [
  { value: 'CONSUMIVEL', label: 'Consumível', color: 'blue' },
  { value: 'PERMANENTE', label: 'Permanente', color: 'purple' },
] as const;

export const MATERIAL_TIPOS_MAP: Record<string, string> = {
  CONSUMIVEL: 'Consumível',
  PERMANENTE: 'Permanente',
};

// ============================================================================
// TIPOS DE EQUIPAMENTO
// ============================================================================

export const EQUIPAMENTO_TIPOS = [
  { value: 'FERRAMENTA_MANUAL', label: 'Ferramenta Manual', icon: '🔧' },
  { value: 'FERRAMENTA_ELETRICA', label: 'Ferramenta Elétrica', icon: '⚡' },
  { value: 'EQUIPAMENTO_MEDICAO', label: 'Equipamento de Medição', icon: '📏' },
  { value: 'EQUIPAMENTO_SEGURANCA', label: 'Equipamento de Segurança', icon: '🦺' },
  { value: 'VEICULO', label: 'Veículo', icon: '🚗' },
  { value: 'MAQUINA', label: 'Máquina', icon: '🏗️' },
  { value: 'OUTRO', label: 'Outro', icon: '📦' },
] as const;

export const EQUIPAMENTO_TIPOS_MAP: Record<string, string> = {
  FERRAMENTA_MANUAL: 'Ferramenta Manual',
  FERRAMENTA_ELETRICA: 'Ferramenta Elétrica',
  EQUIPAMENTO_MEDICAO: 'Equipamento de Medição',
  EQUIPAMENTO_SEGURANCA: 'Equipamento de Segurança',
  VEICULO: 'Veículo',
  MAQUINA: 'Máquina',
  OUTRO: 'Outro',
};

// ============================================================================
// STATUS DE EQUIPAMENTO
// ============================================================================

export const EQUIPAMENTO_STATUS = [
  { value: 'DISPONIVEL', label: 'Disponível', color: 'green', variant: 'default' },
  { value: 'EM_USO', label: 'Em Uso', color: 'blue', variant: 'default' },
  { value: 'EM_MANUTENCAO', label: 'Em Manutenção', color: 'yellow', variant: 'warning' },
  { value: 'INATIVO', label: 'Inativo', color: 'gray', variant: 'secondary' },
] as const;

export const EQUIPAMENTO_STATUS_MAP: Record<string, { label: string; color: string; variant: string }> = {
  DISPONIVEL: { label: 'Disponível', color: 'green', variant: 'default' },
  EM_USO: { label: 'Em Uso', color: 'blue', variant: 'default' },
  EM_MANUTENCAO: { label: 'Em Manutenção', color: 'yellow', variant: 'warning' },
  INATIVO: { label: 'Inativo', color: 'gray', variant: 'secondary' },
};

// ============================================================================
// TIPOS DE MOVIMENTAÇÃO
// ============================================================================

export const MOVIMENTACAO_TIPOS = [
  { value: 'ENTRADA', label: 'Entrada', color: 'green', icon: '📥' },
  { value: 'SAIDA', label: 'Saída', color: 'red', icon: '📤' },
  { value: 'TRANSFERENCIA', label: 'Transferência', color: 'blue', icon: '🔄' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste Positivo', color: 'green', icon: '➕' },
  { value: 'AJUSTE_NEGATIVO', label: 'Ajuste Negativo', color: 'red', icon: '➖' },
  { value: 'RESERVA', label: 'Reserva', color: 'yellow', icon: '🔒' },
  { value: 'CANCELAMENTO_RESERVA', label: 'Cancelamento de Reserva', color: 'orange', icon: '🔓' },
  { value: 'DEVOLUCAO', label: 'Devolução', color: 'purple', icon: '↩️' },
  { value: 'PERDA', label: 'Perda', color: 'red', icon: '❌' },
] as const;

export const MOVIMENTACAO_TIPOS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  ENTRADA: { label: 'Entrada', color: 'green', icon: '📥' },
  SAIDA: { label: 'Saída', color: 'red', icon: '📤' },
  TRANSFERENCIA: { label: 'Transferência', color: 'blue', icon: '🔄' },
  AJUSTE_POSITIVO: { label: 'Ajuste Positivo', color: 'green', icon: '➕' },
  AJUSTE_NEGATIVO: { label: 'Ajuste Negativo', color: 'red', icon: '➖' },
  RESERVA: { label: 'Reserva', color: 'yellow', icon: '🔒' },
  CANCELAMENTO_RESERVA: { label: 'Cancelamento de Reserva', color: 'orange', icon: '🔓' },
  DEVOLUCAO: { label: 'Devolução', color: 'purple', icon: '↩️' },
  PERDA: { label: 'Perda', color: 'red', icon: '❌' },
};

// ============================================================================
// TIPOS DE ALERTA
// ============================================================================

export const ALERTA_TIPOS = [
  { value: 'ESTOQUE_MINIMO', label: 'Estoque Mínimo', icon: '⚠️' },
  { value: 'ESTOQUE_ZERO', label: 'Estoque Zerado', icon: '🚫' },
  { value: 'VALIDADE_PROXIMA', label: 'Validade Próxima', icon: '📅' },
  { value: 'VALIDADE_VENCIDA', label: 'Validade Vencida', icon: '❌' },
  { value: 'CALIBRACAO_PROXIMA', label: 'Calibração Próxima', icon: '🔧' },
  { value: 'CALIBRACAO_VENCIDA', label: 'Calibração Vencida', icon: '⚠️' },
  { value: 'MANUTENCAO_PROXIMA', label: 'Manutenção Próxima', icon: '🔧' },
  { value: 'MANUTENCAO_VENCIDA', label: 'Manutenção Vencida', icon: '⚠️' },
  { value: 'EQUIPAMENTO_NAO_DEVOLVIDO', label: 'Equipamento Não Devolvido', icon: '⏰' },
  { value: 'EQUIPAMENTO_DANIFICADO', label: 'Equipamento Danificado', icon: '🔨' },
] as const;

export const ALERTA_TIPOS_MAP: Record<string, { label: string; icon: string }> = {
  ESTOQUE_MINIMO: { label: 'Estoque Mínimo', icon: '⚠️' },
  ESTOQUE_ZERO: { label: 'Estoque Zerado', icon: '🚫' },
  VALIDADE_PROXIMA: { label: 'Validade Próxima', icon: '📅' },
  VALIDADE_VENCIDA: { label: 'Validade Vencida', icon: '❌' },
  CALIBRACAO_PROXIMA: { label: 'Calibração Próxima', icon: '🔧' },
  CALIBRACAO_VENCIDA: { label: 'Calibração Vencida', icon: '⚠️' },
  MANUTENCAO_PROXIMA: { label: 'Manutenção Próxima', icon: '🔧' },
  MANUTENCAO_VENCIDA: { label: 'Manutenção Vencida', icon: '⚠️' },
  EQUIPAMENTO_NAO_DEVOLVIDO: { label: 'Equipamento Não Devolvido', icon: '⏰' },
  EQUIPAMENTO_DANIFICADO: { label: 'Equipamento Danificado', icon: '🔨' },
};

// ============================================================================
// PRIORIDADES DE ALERTA
// ============================================================================

export const ALERTA_PRIORIDADES = [
  { value: 'BAIXA', label: 'Baixa', color: 'gray', variant: 'secondary' },
  { value: 'MEDIA', label: 'Média', color: 'yellow', variant: 'warning' },
  { value: 'ALTA', label: 'Alta', color: 'orange', variant: 'warning' },
  { value: 'CRITICA', label: 'Crítica', color: 'red', variant: 'destructive' },
] as const;

export const ALERTA_PRIORIDADES_MAP: Record<string, { label: string; color: string; variant: string }> = {
  BAIXA: { label: 'Baixa', color: 'gray', variant: 'secondary' },
  MEDIA: { label: 'Média', color: 'yellow', variant: 'warning' },
  ALTA: { label: 'Alta', color: 'orange', variant: 'warning' },
  CRITICA: { label: 'Crítica', color: 'red', variant: 'destructive' },
};

// ============================================================================
// STATUS DE COMPRA
// ============================================================================

export const COMPRA_STATUS = [
  { value: 'PENDENTE', label: 'Pendente', color: 'yellow', variant: 'warning' },
  { value: 'PARCIAL', label: 'Parcialmente Recebida', color: 'blue', variant: 'default' },
  { value: 'RECEBIDA', label: 'Recebida', color: 'green', variant: 'default' },
  { value: 'CANCELADA', label: 'Cancelada', color: 'red', variant: 'destructive' },
] as const;

export const COMPRA_STATUS_MAP: Record<string, { label: string; color: string; variant: string }> = {
  PENDENTE: { label: 'Pendente', color: 'yellow', variant: 'warning' },
  PARCIAL: { label: 'Parcialmente Recebida', color: 'blue', variant: 'default' },
  RECEBIDA: { label: 'Recebida', color: 'green', variant: 'default' },
  CANCELADA: { label: 'Cancelada', color: 'red', variant: 'destructive' },
};

// ============================================================================
// TIPOS DE COMPRA
// ============================================================================

export const COMPRA_TIPOS = [
  { value: 'MATERIAL', label: 'Material', icon: '📦' },
  { value: 'EQUIPAMENTO', label: 'Equipamento', icon: '🔧' },
  { value: 'AMBOS', label: 'Ambos', icon: '📦🔧' },
] as const;

export const COMPRA_TIPOS_MAP: Record<string, { label: string; icon: string }> = {
  MATERIAL: { label: 'Material', icon: '📦' },
  EQUIPAMENTO: { label: 'Equipamento', icon: '🔧' },
  AMBOS: { label: 'Ambos', icon: '📦🔧' },
};

// ============================================================================
// TIPOS DE LOCALIZAÇÃO
// ============================================================================

export const LOCALIZACAO_TIPOS = [
  { value: 'ALMOXARIFADO', label: 'Almoxarifado', icon: '🏪' },
  { value: 'OBRA', label: 'Obra', icon: '🏗️' },
  { value: 'ESCRITORIO', label: 'Escritório', icon: '🏢' },
  { value: 'VEICULO', label: 'Veículo', icon: '🚗' },
  { value: 'EXTERNO', label: 'Externo', icon: '🌍' },
] as const;

export const LOCALIZACAO_TIPOS_MAP: Record<string, { label: string; icon: string }> = {
  ALMOXARIFADO: { label: 'Almoxarifado', icon: '🏪' },
  OBRA: { label: 'Obra', icon: '🏗️' },
  ESCRITORIO: { label: 'Escritório', icon: '🏢' },
  VEICULO: { label: 'Veículo', icon: '🚗' },
  EXTERNO: { label: 'Externo', icon: '🌍' },
};

// ============================================================================
// CONDIÇÕES DE RETORNO
// ============================================================================

export const CONDICOES_RETORNO = [
  { value: 'BOM', label: 'Bom Estado', color: 'green' },
  { value: 'REGULAR', label: 'Estado Regular', color: 'yellow' },
  { value: 'RUIM', label: 'Estado Ruim', color: 'red' },
] as const;

export const CONDICOES_RETORNO_MAP: Record<string, { label: string; color: string }> = {
  BOM: { label: 'Bom Estado', color: 'green' },
  REGULAR: { label: 'Estado Regular', color: 'yellow' },
  RUIM: { label: 'Estado Ruim', color: 'red' },
};

// ============================================================================
// PAGINAÇÃO
// ============================================================================

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// ORDENAÇÃO
// ============================================================================

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const MATERIAL_SORT_OPTIONS = [
  { value: 'nome', label: 'Nome' },
  { value: 'codigo', label: 'Código' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'categoria', label: 'Categoria' },
  { value: 'precoUnitario', label: 'Preço' },
  { value: 'createdAt', label: 'Data de Criação' },
] as const;

export const EQUIPAMENTO_SORT_OPTIONS = [
  { value: 'nome', label: 'Nome' },
  { value: 'codigo', label: 'Código' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'status', label: 'Status' },
  { value: 'dataAquisicao', label: 'Data de Aquisição' },
  { value: 'createdAt', label: 'Data de Criação' },
] as const;

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export const VALIDATION_RULES = {
  CODIGO: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[A-Z0-9-]+$/,
  },
  NOME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  DESCRICAO: {
    MAX_LENGTH: 500,
  },
  OBSERVACOES: {
    MAX_LENGTH: 1000,
  },
  QUANTIDADE: {
    MIN: 0,
    MAX: 999999.99,
  },
  VALOR: {
    MIN: 0,
    MAX: 9999999.99,
  },
} as const;

// ============================================================================
// MENSAGENS
// ============================================================================

export const MESSAGES = {
  SUCCESS: {
    CREATE: 'Registro criado com sucesso!',
    UPDATE: 'Registro atualizado com sucesso!',
    DELETE: 'Registro excluído com sucesso!',
    SAVE: 'Salvo com sucesso!',
  },
  ERROR: {
    GENERIC: 'Ocorreu um erro. Tente novamente.',
    NETWORK: 'Erro de conexão. Verifique sua internet.',
    NOT_FOUND: 'Registro não encontrado.',
    VALIDATION: 'Preencha todos os campos obrigatórios.',
    INSUFFICIENT_STOCK: 'Saldo insuficiente.',
  },
  CONFIRM: {
    DELETE: 'Tem certeza que deseja excluir este registro?',
    CANCEL: 'Tem certeza que deseja cancelar?',
  },
} as const;

// ============================================================================
// ÍCONES (Lucide React)
// ============================================================================

export const ICONS = {
  MATERIAL: 'Package',
  EQUIPAMENTO: 'Wrench',
  MOVIMENTACAO: 'ArrowRightLeft',
  ALERTA: 'AlertTriangle',
  COMPRA: 'ShoppingCart',
  DASHBOARD: 'LayoutDashboard',
  RELATORIO: 'FileText',
  ADD: 'Plus',
  EDIT: 'Pencil',
  DELETE: 'Trash2',
  SEARCH: 'Search',
  FILTER: 'Filter',
  EXPORT: 'Download',
  SETTINGS: 'Settings',
  CLOSE: 'X',
  CHECK: 'Check',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  CALENDAR: 'Calendar',
  USER: 'User',
} as const;

// ============================================================================
// CORES (Tailwind CSS)
// ============================================================================

export const COLORS = {
  PRIMARY: 'blue',
  SECONDARY: 'gray',
  SUCCESS: 'green',
  WARNING: 'yellow',
  DANGER: 'red',
  INFO: 'cyan',
} as const;

// ============================================================================
// EXPORTAÇÃO DE RELATÓRIOS
// ============================================================================

export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: 'FileSpreadsheet' },
  { value: 'pdf', label: 'PDF', icon: 'FileText' },
  { value: 'excel', label: 'Excel', icon: 'FileSpreadsheet' },
] as const;

// ============================================================================
// PERÍODOS PRÉ-DEFINIDOS (Relatórios)
// ============================================================================

export const REPORT_PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último ano' },
  { value: 'custom', label: 'Período personalizado' },
] as const;
