/**
 * Schemas de Validação - Módulo Despesas
 * 
 * Validações Zod para o sistema de despesas com workflow de aprovação
 */

import { z } from 'zod';

// ========================================
// ENUMS
// ========================================

export const TipoDespesaEnum = z.enum([
  'OPERACIONAL',
  'ADMINISTRATIVA',
  'PESSOAL',
  'MARKETING',
  'TECNOLOGIA',
  'IMPOSTOS',
  'ALUGUEL',
  'SERVIÇOS',
  'FORNECEDORES',
  'OUTROS'
]);

export const StatusDespesaEnum = z.enum([
  'PENDENTE',
  'AGUARDANDO_APROVACAO',
  'APROVADA',
  'REJEITADA',
  'PAGA',
  'CANCELADA'
]);

export const StatusAprovacaoEnum = z.enum([
  'PENDENTE',
  'EM_ANALISE',
  'APROVADA',
  'REJEITADA',
  'CANCELADA'
]);

export const TipoAprovadorEnum = z.enum([
  'GERENTE',
  'DIRETOR',
  'FINANCEIRO',
  'ADMINISTRADOR'
]);

export const FormaPagamentoEnum = z.enum([
  'DINHEIRO',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'PIX',
  'TRANSFERENCIA',
  'BOLETO',
  'CHEQUE'
]);

// ========================================
// VALIDAÇÕES CUSTOMIZADAS
// ========================================

// Validar que data de vencimento seja >= data de emissão
const validateDates = (data: { dataEmissao: Date; dataVencimento: Date }) => {
  return data.dataVencimento >= data.dataEmissao;
};

// Validar que valor seja positivo
const validatePositiveValue = (valor: number) => valor > 0;

// Validar formato de anexo (URL ou caminho local)
const validateAttachmentUrl = (url: string) => {
  // Aceitar URLs http/https OU caminhos locais começando com /
  const urlPattern = /^(https?:\/\/.+|\/.*\.[\w]{2,5})$/;
  return urlPattern.test(url);
};

// ========================================
// SCHEMA: CREATE EXPENSE
// ========================================

export const createExpenseSchema = z.object({
  empresaId: z.number().int().positive('ID da empresa deve ser positivo'),

  categoriaId: z.number().int().positive('ID da categoria deve ser positivo'),

  fornecedorId: z.number().int().positive('ID do fornecedor deve ser positivo')
    .optional()
    .nullable(),

  descricao: z.string()
    .min(3, 'Descrição deve ter no mínimo 3 caracteres')
    .max(255, 'Descrição deve ter no máximo 255 caracteres')
    .trim(),

  valor: z.number()
    .positive('Valor deve ser positivo')
    .refine(validatePositiveValue, 'Valor deve ser maior que zero')
    .refine(val => val <= 999999999.99, 'Valor máximo excedido (R$ 999.999.999,99)'),

  tipo: TipoDespesaEnum,

  formaPagamento: FormaPagamentoEnum,

  status: StatusDespesaEnum.default('PENDENTE'),

  // Datas
  dataEmissao: z.coerce.date(),

  dataVencimento: z.coerce.date(),

  dataPagamento: z.coerce.date().optional().nullable(),

  // Aprovação
  requerAprovacao: z.boolean().default(false),

  // Aprovação detalhada (se requerAprovacao = true)
  aprovacao: z.object({
    aprovadorId: z.number().int().positive('ID do aprovador deve ser positivo'),
    tipoAprovador: TipoAprovadorEnum.default('GERENTE'),
    nivelAprovacao: z.number().int().min(1).max(5).default(1),
    requerProximoNivel: z.boolean().default(false),
    proximoAprovadorId: z.number().int().positive().optional().nullable(),
    justificativa: z.string()
      .min(10, 'Justificativa deve ter no mínimo 10 caracteres')
      .max(1000, 'Justificativa deve ter no máximo 1000 caracteres')
      .optional()
      .nullable()
  }).optional(),

  // Anexos
  anexoUrl: z.string()
    .max(500, 'URL do anexo muito longa')
    .refine(validateAttachmentUrl, 'Formato de anexo inválido (deve ser URL http/https ou caminho local)')
    .optional()
    .nullable(),

  numeroDocumento: z.string()
    .max(100, 'Número do documento muito longo')
    .optional()
    .nullable(),

  observacoes: z.string()
    .max(5000, 'Observações muito longas')
    .optional()
    .nullable(),

  criadoPor: z.number().int().positive('ID do criador deve ser positivo').optional()

}).refine(validateDates, {
  message: 'Data de vencimento deve ser igual ou posterior à data de emissão',
  path: ['dataVencimento']
}).refine(
  data => {
    // Se requer aprovação, dados de aprovação são obrigatórios
    if (data.requerAprovacao) {
      return !!data.aprovacao && !!data.aprovacao.aprovadorId;
    }
    return true;
  },
  {
    message: 'Dados de aprovação são obrigatórios quando requerAprovacao = true',
    path: ['aprovacao']
  }
).refine(
  data => {
    // Se status é PAGA, dataPagamento é obrigatória
    if (data.status === 'PAGA') {
      return !!data.dataPagamento;
    }
    return true;
  },
  {
    message: 'Data de pagamento é obrigatória quando status é PAGA',
    path: ['dataPagamento']
  }
).refine(
  data => {
    // Se dataPagamento existe, status deve ser PAGA
    if (data.dataPagamento && data.status !== 'PAGA') {
      return false;
    }
    return true;
  },
  {
    message: 'Status deve ser PAGA quando data de pagamento está preenchida',
    path: ['status']
  }
);

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// ========================================
// SCHEMA: UPDATE EXPENSE
// ========================================

export const updateExpenseSchema = z.object({
  categoriaId: z.number().int().positive().optional(),
  fornecedorId: z.number().int().positive().optional().nullable(),
  descricao: z.string().min(3).max(255).trim().optional(),
  valor: z.number().positive().refine(validatePositiveValue).optional(),
  tipo: TipoDespesaEnum.optional(),
  formaPagamento: FormaPagamentoEnum.optional(),
  status: StatusDespesaEnum.optional(),
  dataEmissao: z.coerce.date().optional(),
  dataVencimento: z.coerce.date().optional(),
  dataPagamento: z.coerce.date().optional().nullable(),
  anexoUrl: z.string().url().max(500).optional().nullable(),
  numeroDocumento: z.string().max(100).optional().nullable(),
  observacoes: z.string().max(5000).optional().nullable()
}).partial().refine(
  data => {
    // Se ambas as datas existem, validar ordem
    if (data.dataEmissao && data.dataVencimento) {
      return data.dataVencimento >= data.dataEmissao;
    }
    return true;
  },
  {
    message: 'Data de vencimento deve ser >= data de emissão',
    path: ['dataVencimento']
  }
);

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// ========================================
// SCHEMA: EXPENSE FILTERS
// ========================================

export const expenseFiltersSchema = z.object({
  empresaId: z.number().int().positive(),

  // Filtros de status
  status: StatusDespesaEnum.optional(),
  tipo: TipoDespesaEnum.optional(),
  formaPagamento: FormaPagamentoEnum.optional(),

  // Filtros de relacionamento
  categoriaId: z.number().int().positive().optional(),
  fornecedorId: z.number().int().positive().optional(),
  compraId: z.number().int().positive().optional(),
  criadoPor: z.number().int().positive().optional(),
  projetoId: z.number().int().positive().optional(),    // expenses linked to a project
  serviceOrderId: z.number().int().positive().optional(), // expenses from an OS reimbursement

  // Filtros de valor
  valorMin: z.number().positive().optional(),
  valorMax: z.number().positive().optional(),

  // Filtros de data
  dataEmissaoInicio: z.coerce.date().optional(),
  dataEmissaoFim: z.coerce.date().optional(),
  dataVencimentoInicio: z.coerce.date().optional(),
  dataVencimentoFim: z.coerce.date().optional(),
  dataPagamentoInicio: z.coerce.date().optional(),
  dataPagamentoFim: z.coerce.date().optional(),

  // Filtros de aprovação
  requerAprovacao: z.boolean().optional(),
  aprovada: z.boolean().optional(), // true = APROVADA, false = REJEITADA
  pendente: z.boolean().optional(),  // true = AGUARDANDO_APROVACAO

  // Busca textual
  search: z.string().max(255).optional(), // Busca em descricao, numeroDocumento, observacoes

  // Paginação
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),

  // Ordenação
  sortBy: z.enum([
    'dataEmissao',
    'dataVencimento',
    'dataPagamento',
    'valor',
    'status',
    'descricao',
    'criadoEm'
  ]).default('dataVencimento'),

  sortOrder: z.enum(['asc', 'desc']).default('desc')

}).refine(
  data => {
    // valorMax deve ser >= valorMin
    if (data.valorMin && data.valorMax) {
      return data.valorMax >= data.valorMin;
    }
    return true;
  },
  {
    message: 'Valor máximo deve ser >= valor mínimo',
    path: ['valorMax']
  }
).refine(
  data => {
    // Validar ranges de datas
    if (data.dataEmissaoInicio && data.dataEmissaoFim) {
      return data.dataEmissaoFim >= data.dataEmissaoInicio;
    }
    return true;
  },
  {
    message: 'Data de emissão final deve ser >= data inicial',
    path: ['dataEmissaoFim']
  }
);

export type ExpenseFiltersInput = z.infer<typeof expenseFiltersSchema>;

// ========================================
// SCHEMA: EXPENSE APPROVAL
// ========================================

export const approveExpenseSchema = z.object({
  expenseId: z.number().int().positive('ID da despesa deve ser positivo'),
  aprovadorId: z.number().int().positive('ID do aprovador deve ser positivo'),

  comentario: z.string()
    .max(1000, 'Comentário deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),

  // Para aprovação multi-nível
  requerProximoNivel: z.boolean().default(false),
  proximoAprovadorId: z.number().int().positive().optional().nullable()

}).refine(
  data => {
    // Se requer próximo nível, proximoAprovadorId é obrigatório
    if (data.requerProximoNivel) {
      return !!data.proximoAprovadorId;
    }
    return true;
  },
  {
    message: 'ID do próximo aprovador é obrigatório quando requerProximoNivel = true',
    path: ['proximoAprovadorId']
  }
);

export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;

// ========================================
// SCHEMA: REJECT EXPENSE
// ========================================

export const rejectExpenseSchema = z.object({
  expenseId: z.number().int().positive('ID da despesa deve ser positivo'),
  aprovadorId: z.number().int().positive('ID do aprovador deve ser positivo'),

  comentario: z.string()
    .min(10, 'Comentário de rejeição deve ter no mínimo 10 caracteres')
    .max(1000, 'Comentário deve ter no máximo 1000 caracteres')
});

export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;

// ========================================
// SCHEMA: EXPENSE CATEGORY
// ========================================

export const createExpenseCategorySchema = z.object({
  empresaId: z.number().int().positive('ID da empresa deve ser positivo'),

  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),

  descricao: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),

  cor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)')
    .default('#EF4444'), // Red for expenses

  icone: z.string()
    .max(50, 'Nome do ícone muito longo')
    .optional()
    .nullable(),

  ativo: z.boolean().default(true),

  orcamentoMensal: z.number()
    .positive('Orçamento mensal deve ser positivo')
    .refine(val => val <= 999999999.99, 'Orçamento máximo excedido')
    .optional()
    .nullable()
});

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;

export const updateExpenseCategorySchema = createExpenseCategorySchema
  .omit({ empresaId: true })
  .partial();

export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;

// ========================================
// SCHEMA: PAY EXPENSE
// ========================================

export const payExpenseSchema = z.object({
  expenseId: z.number().int().positive('ID da despesa deve ser positivo'),
  dataPagamento: z.coerce.date(),
  formaPagamento: FormaPagamentoEnum.optional(), // Permitir alterar forma de pagamento
  observacoes: z.string().max(1000).optional().nullable()
});

export type PayExpenseInput = z.infer<typeof payExpenseSchema>;

// ========================================
// HELPERS DE VALIDAÇÃO
// ========================================

/**
 * Valida se usuário pode aprovar despesa baseado no tipo de aprovador
 */
export const canUserApprove = (
  userRole: string,
  tipoAprovador: z.infer<typeof TipoAprovadorEnum>
): boolean => {
  const roleHierarchy: Record<string, number> = {
    ADMINISTRADOR: 4,
    FINANCEIRO: 3,
    DIRETOR: 2,
    GERENTE: 1
  };

  const requiredLevel = roleHierarchy[tipoAprovador] || 0;
  const userLevel = roleHierarchy[userRole] || 0;

  return userLevel >= requiredLevel;
};

/**
 * Determina tipo de aprovador baseado no valor da despesa
 */
export const determineApprovalType = (valor: number): z.infer<typeof TipoAprovadorEnum> => {
  if (valor >= 50000) return 'ADMINISTRADOR';
  if (valor >= 20000) return 'DIRETOR';
  if (valor >= 5000) return 'FINANCEIRO';
  return 'GERENTE';
};

/**
 * Verifica se despesa requer múltiplos níveis de aprovação
 */
export const requiresMultiLevelApproval = (valor: number, tipo: z.infer<typeof TipoDespesaEnum>): boolean => {
  // Regras de negócio:
  // 1. Valores > R$ 50.000 sempre requerem 2 níveis
  // 2. PESSOAL (salários) > R$ 10.000 requer 2 níveis
  // 3. IMPOSTOS sempre requer aprovação do financeiro

  if (valor > 50000) return true;
  if (tipo === 'PESSOAL' && valor > 10000) return true;
  if (tipo === 'IMPOSTOS') return true;

  return false;
};
