// src/schemas/revenue.schema.ts
// Schemas de validação Zod para Revenue (Receitas)

import { z } from 'zod';

/**
 * Schema para criar uma nova receita
 */
export const createRevenueSchema = z.object({
  empresaId: z.number().int().positive({ message: 'ID da empresa é obrigatório' }),
  categoriaId: z.number().int().positive({ message: 'Categoria é obrigatória' }),
  clienteId: z.number().int().positive().optional(),
  descricao: z.string()
    .min(3, 'Descrição deve ter no mínimo 3 caracteres')
    .max(255, 'Descrição deve ter no máximo 255 caracteres'),
  valor: z.number()
    .positive('Valor deve ser positivo')
    .max(9999999.99, 'Valor máximo permitido: R$ 9.999.999,99'),
  dataEmissao: z.string().datetime({ message: 'Data de emissão inválida' }),
  dataVencimento: z.string().datetime({ message: 'Data de vencimento inválida' }),
  dataPagamento: z.string().datetime().optional(),
  tipo: z.enum([
    'SERVICO',
    'VENDA_PRODUTO',
    'CONSULTORIA',
    'MENSALIDADE',
    'COMISSAO',
    'OUTROS'
  ], {
    message: 'Tipo de receita inválido'
  }),
  formaPagamento: z.enum([
    'DINHEIRO',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'PIX',
    'TRANSFERENCIA',
    'BOLETO',
    'CHEQUE'
  ], {
    message: 'Forma de pagamento inválida'
  }),
  status: z.enum(['PENDENTE', 'RECEBIDA', 'VENCIDA', 'CANCELADA'])
    .default('PENDENTE'),
  observacoes: z.string().max(5000).optional(),
  recorrente: z.boolean().default(false),
  recorrencia: z.object({
    frequencia: z.enum([
      'SEMANAL',
      'QUINZENAL',
      'MENSAL',
      'BIMESTRAL',
      'TRIMESTRAL',
      'SEMESTRAL',
      'ANUAL'
    ]),
    diaVencimento: z.number().int().min(1).max(31),
    dataInicio: z.string().datetime(),
    dataFim: z.string().datetime().optional(),
  }).optional(),
}).refine((data) => {
  // Se recorrente = true, recorrencia deve estar presente
  if (data.recorrente && !data.recorrencia) {
    return false;
  }
  return true;
}, {
  message: 'Recorrência é obrigatória quando receita é recorrente',
  path: ['recorrencia']
}).refine((data) => {
  // dataVencimento deve ser >= dataEmissao
  const emissao = new Date(data.dataEmissao);
  const vencimento = new Date(data.dataVencimento);
  return vencimento >= emissao;
}, {
  message: 'Data de vencimento deve ser igual ou posterior à data de emissão',
  path: ['dataVencimento']
}).refine((data) => {
  // Se dataPagamento existe, deve ser >= dataEmissao
  if (data.dataPagamento) {
    const emissao = new Date(data.dataEmissao);
    const pagamento = new Date(data.dataPagamento);
    return pagamento >= emissao;
  }
  return true;
}, {
  message: 'Data de pagamento deve ser igual ou posterior à data de emissão',
  path: ['dataPagamento']
});

/**
 * Schema para atualizar uma receita existente
 */
export const updateRevenueSchema = z.object({
  categoriaId: z.number().int().positive().optional(),
  clienteId: z.number().int().positive().nullable().optional(),
  descricao: z.string().min(3).max(255).optional(),
  valor: z.number().positive().max(9999999.99).optional(),
  dataEmissao: z.string().datetime().optional(),
  dataVencimento: z.string().datetime().optional(),
  dataPagamento: z.string().datetime().nullable().optional(),
  tipo: z.enum([
    'SERVICO',
    'VENDA_PRODUTO',
    'CONSULTORIA',
    'MENSALIDADE',
    'COMISSAO',
    'OUTROS'
  ]).optional(),
  formaPagamento: z.enum([
    'DINHEIRO',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'PIX',
    'TRANSFERENCIA',
    'BOLETO',
    'CHEQUE'
  ]).optional(),
  status: z.enum(['PENDENTE', 'RECEBIDA', 'VENCIDA', 'CANCELADA']).optional(),
  observacoes: z.string().max(5000).nullable().optional(),
});

/**
 * Schema para criar recorrência em receita existente
 */
export const createRecurrenceSchema = z.object({
  frequencia: z.enum([
    'SEMANAL',
    'QUINZENAL',
    'MENSAL',
    'BIMESTRAL',
    'TRIMESTRAL',
    'SEMESTRAL',
    'ANUAL'
  ]),
  diaVencimento: z.number().int().min(1).max(31),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
}).refine((data) => {
  // Se dataFim existe, deve ser > dataInicio
  if (data.dataFim) {
    const inicio = new Date(data.dataInicio);
    const fim = new Date(data.dataFim);
    return fim > inicio;
  }
  return true;
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['dataFim']
});

/**
 * Schema para filtros de listagem
 */
export const revenueFiltersSchema = z.object({
  empresaId: z.number().int().positive(),
  status: z.enum(['PENDENTE', 'RECEBIDA', 'VENCIDA', 'CANCELADA']).optional(),
  categoriaId: z.number().int().positive().optional(),
  clienteId: z.number().int().positive().optional(),
  tipo: z.enum([
    'SERVICO',
    'VENDA_PRODUTO',
    'CONSULTORIA',
    'MENSALIDADE',
    'COMISSAO',
    'OUTROS'
  ]).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  orderBy: z.enum(['dataVencimento', 'dataEmissao', 'valor', 'criadoEm']).default('dataVencimento'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Tipos TypeScript inferidos dos schemas
export type CreateRevenueInput = z.infer<typeof createRevenueSchema>;
export type UpdateRevenueInput = z.infer<typeof updateRevenueSchema>;
export type CreateRecurrenceInput = z.infer<typeof createRecurrenceSchema>;
export type RevenueFilters = z.infer<typeof revenueFiltersSchema>;
