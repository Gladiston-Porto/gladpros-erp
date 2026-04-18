/**
 * Validadores Zod - Módulo Estoque
 * Schemas de validação para formulários client-side
 */

import { z } from 'zod';
import { VALIDATION_RULES } from '../constants';

// ============================================================================
// SCHEMAS BASE
// ============================================================================

/**
 * Schema para código (ex: MAT-001, EQP-001)
 */
const codigoSchema = z
  .string()
  .min(
    VALIDATION_RULES.CODIGO.MIN_LENGTH,
    `Código deve ter no mínimo ${VALIDATION_RULES.CODIGO.MIN_LENGTH} caracteres`
  )
  .max(
    VALIDATION_RULES.CODIGO.MAX_LENGTH,
    `Código deve ter no máximo ${VALIDATION_RULES.CODIGO.MAX_LENGTH} caracteres`
  )
  .regex(
    VALIDATION_RULES.CODIGO.PATTERN,
    'Código deve conter apenas letras maiúsculas, números e hífen'
  );

/**
 * Schema para nome
 */
const nomeSchema = z
  .string()
  .min(
    VALIDATION_RULES.NOME.MIN_LENGTH,
    `Nome deve ter no mínimo ${VALIDATION_RULES.NOME.MIN_LENGTH} caracteres`
  )
  .max(
    VALIDATION_RULES.NOME.MAX_LENGTH,
    `Nome deve ter no máximo ${VALIDATION_RULES.NOME.MAX_LENGTH} caracteres`
  );

/**
 * Schema para descrição (opcional)
 */
const descricaoSchema = z
  .string()
  .max(
    VALIDATION_RULES.DESCRICAO.MAX_LENGTH,
    `Descrição deve ter no máximo ${VALIDATION_RULES.DESCRICAO.MAX_LENGTH} caracteres`
  )
  .optional();

/**
 * Schema para observações (opcional)
 */
const observacoesSchema = z
  .string()
  .max(
    VALIDATION_RULES.OBSERVACOES.MAX_LENGTH,
    `Observações devem ter no máximo ${VALIDATION_RULES.OBSERVACOES.MAX_LENGTH} caracteres`
  )
  .optional();

/**
 * Schema para quantidade
 */
const quantidadeSchema = z
  .number()
  .positive('Quantidade deve ser maior que zero')
  .max(VALIDATION_RULES.QUANTIDADE.MAX, `Quantidade máxima: ${VALIDATION_RULES.QUANTIDADE.MAX}`);

/**
 * Schema para valor monetário
 */
const valorSchema = z
  .number()
  .nonnegative('Valor não pode ser negativo')
  .max(VALIDATION_RULES.VALOR.MAX, `Valor máximo: ${VALIDATION_RULES.VALOR.MAX}`);

/**
 * Schema para data
 */
const dataSchema = z.coerce.date();

// ============================================================================
// MATERIAL
// ============================================================================

/**
 * Schema de validação para Material
 */
export const materialSchema = z.object({
  codigo: codigoSchema,
  nome: nomeSchema,
  descricao: descricaoSchema,
  categoriaId: z.number().positive('Selecione uma categoria válida'),
  unidadeId: z.number().positive('Selecione uma unidade válida'),
  tipo: z.enum(['CONSUMIVEL', 'PERMANENTE']),
  estoqueMinimo: z.number().nonnegative('Estoque mínimo não pode ser negativo'),
  pontoReposicao: z.number().nonnegative('Ponto de reposição não pode ser negativo'),
  rastreioLote: z.boolean().default(false),
  possuiValidade: z.boolean().default(false),
  precoUnitario: valorSchema,
  marca: z.string().max(50, 'Marca deve ter no máximo 50 caracteres').optional(),
  referencia: z.string().max(50, 'Referência deve ter no máximo 50 caracteres').optional(),
  observacoes: observacoesSchema,
}).refine((data) => data.pontoReposicao >= data.estoqueMinimo, {
  message: 'Ponto de reposição deve ser maior ou igual ao estoque mínimo',
  path: ['pontoReposicao'],
});

export type MaterialInput = z.infer<typeof materialSchema>;

// ============================================================================
// EQUIPAMENTO
// ============================================================================

/**
 * Schema de validação para Equipamento
 */
export const equipamentoSchema = z.object({
  codigo: codigoSchema,
  nome: nomeSchema,
  tipo: z.enum([
    'FERRAMENTA_MANUAL',
    'FERRAMENTA_ELETRICA',
    'EQUIPAMENTO_MEDICAO',
    'EQUIPAMENTO_SEGURANCA',
    'ANDAIME',
    'ESCADA',
    'VEICULO',
    'OUTRO',
  ]),
  categoriaId: z.number().positive('Selecione uma categoria válida').optional(),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(80).optional(),
  numeroSerie: z.string().max(120, 'Número de série deve ter no máximo 120 caracteres').optional(),
  anoFabricacao: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  dataAquisicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  valorAquisicao: z.number().nonnegative('Valor deve ser maior ou igual a zero'),
  fornecedorId: z.number().positive('Selecione um fornecedor válido').optional(),
  notaFiscal: z.string().max(60).optional(),
  status: z.enum([
    'DISPONIVEL',
    'EM_USO',
    'EM_MANUTENCAO',
    'CALIBRACAO',
    'DANIFICADO',
    'PERDIDO',
    'DESCARTADO',
  ]).default('DISPONIVEL'),
  localizacaoAtual: z.string().max(200).optional(),
  requerCalibracao: z.boolean(),
  periodicidadeCalibracaoDias: z.number().int().positive().optional(),
  ultimaCalibracao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().or(z.literal('')),
  requerManutencaoPeriodica: z.boolean(),
  periodicidadeManutencaoDias: z.number().int().positive().optional(),
  ultimaManutencao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().or(z.literal('')),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

export type EquipamentoInput = z.infer<typeof equipamentoSchema>;

// ============================================================================
// MOVIMENTAÇÃO
// ============================================================================

/**
 * Schema base para Movimentação
 */
const movimentacaoBaseSchema = z.object({
  tipo: z.enum([
    'ENTRADA',
    'SAIDA',
    'TRANSFERENCIA',
    'AJUSTE_POSITIVO',
    'AJUSTE_NEGATIVO',
    'RESERVA',
    'CANCELAMENTO_RESERVA',
    'DEVOLUCAO',
    'PERDA',
  ]),
  materialId: z.number().positive('Selecione um material válido'),
  loteId: z.number().positive().optional(),
  quantidade: quantidadeSchema,
  observacoes: observacoesSchema,
});

/**
 * Schema para Movimentação ENTRADA
 */
export const movimentacaoEntradaSchema = movimentacaoBaseSchema.extend({
  tipo: z.literal('ENTRADA'),
  localizacaoDestinoId: z.number().positive('Selecione uma localização válida'),
});

/**
 * Schema para Movimentação SAIDA
 */
export const movimentacaoSaidaSchema = movimentacaoBaseSchema.extend({
  tipo: z.literal('SAIDA'),
  localizacaoOrigemId: z.number().positive('Selecione uma localização válida'),
  projetoId: z.number().positive('Selecione um projeto válido').optional(),
});

/**
 * Schema para Movimentação TRANSFERENCIA
 */
export const movimentacaoTransferenciaSchema = movimentacaoBaseSchema.extend({
  tipo: z.literal('TRANSFERENCIA'),
  localizacaoOrigemId: z.number().positive('Selecione uma localização válida'),
  localizacaoDestinoId: z.number().positive('Selecione uma localização válida'),
}).refine((data) => data.localizacaoOrigemId !== data.localizacaoDestinoId, {
  message: 'Localização de origem e destino devem ser diferentes',
  path: ['localizacaoDestinoId'],
});

/**
 * Schema genérico de Movimentação (union)
 */
export const movimentacaoSchema = z.discriminatedUnion('tipo', [
  movimentacaoEntradaSchema,
  movimentacaoSaidaSchema,
  movimentacaoTransferenciaSchema,
  movimentacaoBaseSchema.extend({
    tipo: z.enum(['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'RESERVA', 'CANCELAMENTO_RESERVA', 'DEVOLUCAO', 'PERDA']),
    localizacaoOrigemId: z.number().positive().optional(),
    localizacaoDestinoId: z.number().positive().optional(),
    projetoId: z.number().positive().optional(),
  }),
]);

export type MovimentacaoInput = z.infer<typeof movimentacaoSchema>;

// ============================================================================
// ALOCAÇÃO DE EQUIPAMENTO
// ============================================================================

/**
 * Schema para Alocação de Equipamento
 */
export const alocacaoEquipamentoSchema = z.object({
  projetoId: z.number().positive('Selecione um projeto válido'),
  responsavelId: z.number().positive('Selecione um responsável válido'),
  dataAlocacao: dataSchema.optional(),
  dataDevolucaoPrevista: dataSchema.optional(),
  observacoes: observacoesSchema,
}).refine((data) => {
  if (data.dataAlocacao && data.dataDevolucaoPrevista) {
    return data.dataDevolucaoPrevista >= data.dataAlocacao;
  }
  return true;
}, {
  message: 'Data de devolução deve ser posterior à data de alocação',
  path: ['dataDevolucaoPrevista'],
});

export type AlocacaoEquipamentoInput = z.infer<typeof alocacaoEquipamentoSchema>;

// ============================================================================
// DEVOLUÇÃO DE EQUIPAMENTO
// ============================================================================

/**
 * Schema para Devolução de Equipamento
 */
export const devolucaoEquipamentoSchema = z.object({
  dataDevolucaoReal: dataSchema.optional(),
  condicaoRetorno: z.enum(['BOM', 'REGULAR', 'RUIM']),
  observacoes: observacoesSchema,
});

export type DevolucaoEquipamentoInput = z.infer<typeof devolucaoEquipamentoSchema>;

// ============================================================================
// ALERTA
// ============================================================================

/**
 * Schema para Resolução de Alerta
 */
export const resolverAlertaSchema = z.object({
  solucao: z.string()
    .min(10, 'Solução deve ter no mínimo 10 caracteres')
    .max(500, 'Solução deve ter no máximo 500 caracteres'),
});

export type ResolverAlertaInput = z.infer<typeof resolverAlertaSchema>;

// ============================================================================
// COMPRA
// ============================================================================

/**
 * Schema para Item de Compra
 */
const compraItemSchema = z.object({
  tipoItem: z.enum(['MATERIAL', 'EQUIPAMENTO']),
  materialId: z.number().positive().optional(),
  equipamentoId: z.number().positive().optional(),
  quantidade: quantidadeSchema,
  custoUnitario: valorSchema,
}).refine((data) => {
  // Se tipoItem for MATERIAL, materialId é obrigatório
  if (data.tipoItem === 'MATERIAL') {
    return data.materialId !== undefined && data.materialId > 0;
  }
  // Se tipoItem for EQUIPAMENTO, equipamentoId é obrigatório
  if (data.tipoItem === 'EQUIPAMENTO') {
    return data.equipamentoId !== undefined && data.equipamentoId > 0;
  }
  return true;
}, {
  message: 'Selecione o item correspondente ao tipo',
  path: ['materialId'],
});

/**
 * Schema para Compra
 */
export const compraSchema = z.object({
  fornecedorId: z.number().positive('Selecione um fornecedor válido'),
  projetoId: z.number().positive('Selecione um projeto válido').optional(),
  numeroNf: z.string().max(50, 'Número da NF deve ter no máximo 50 caracteres').optional(),
  dataCompra: dataSchema,
  dataEntrega: dataSchema.optional(),
  tipo: z.enum(['MATERIAL', 'EQUIPAMENTO', 'AMBOS']),
  valorTotal: valorSchema,
  desconto: valorSchema.optional(),
  frete: valorSchema.optional(),
  formaPagamento: z.string().max(50, 'Forma de pagamento deve ter no máximo 50 caracteres').optional(),
  observacoes: observacoesSchema,
  itens: z.array(compraItemSchema).min(1, 'Adicione pelo menos um item'),
}).refine((data) => {
  if (data.dataEntrega && data.dataCompra) {
    return data.dataEntrega >= data.dataCompra;
  }
  return true;
}, {
  message: 'Data de entrega deve ser posterior à data de compra',
  path: ['dataEntrega'],
});

export type CompraInput = z.infer<typeof compraSchema>;

// ============================================================================
// RECEBIMENTO DE COMPRA
// ============================================================================

/**
 * Schema para Item Recebido
 */
const itemRecebidoSchema = z.object({
  itemId: z.number().positive(),
  quantidadeRecebida: quantidadeSchema,
  localizacaoId: z.number().positive('Selecione uma localização válida'),
  lote: z.object({
    codigoLote: z.string().min(1, 'Código do lote é obrigatório').max(50),
    dataFabricacao: dataSchema.optional(),
    dataValidade: dataSchema.optional(),
  }).optional(),
});

/**
 * Schema para Recebimento de Compra
 */
export const recebimentoCompraSchema = z.object({
  dataRecebimento: dataSchema.optional(),
  itensRecebidos: z.array(itemRecebidoSchema).min(1, 'Selecione pelo menos um item para receber'),
});

export type RecebimentoCompraInput = z.infer<typeof recebimentoCompraSchema>;

// ============================================================================
// FILTROS
// ============================================================================

/**
 * Schema para Filtro de Data
 */
export const filtroDataSchema = z.object({
  dataInicio: dataSchema.optional(),
  dataFim: dataSchema.optional(),
}).refine((data) => {
  if (data.dataInicio && data.dataFim) {
    return data.dataFim >= data.dataInicio;
  }
  return true;
}, {
  message: 'Data final deve ser posterior à data inicial',
  path: ['dataFim'],
});

export type FiltroDataInput = z.infer<typeof filtroDataSchema>;

// ============================================================================
// HELPERS DE VALIDAÇÃO
// ============================================================================

/**
 * Valida se o código está no formato correto (PREFIX-0000)
 */
export function validateCodigoFormat(codigo: string, prefix: string): boolean {
  const pattern = new RegExp(`^${prefix}-\\d{4}$`);
  return pattern.test(codigo);
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14) return false;

  // Validação básica (todos iguais)
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validação dos dígitos verificadores
  let sum = 0;
  let factor = 5;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * factor;
    factor = factor === 2 ? 9 : factor - 1;
  }

  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleaned[12]) !== digit) return false;

  sum = 0;
  factor = 6;

  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * factor;
    factor = factor === 2 ? 9 : factor - 1;
  }

  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cleaned[13]) === digit;
}

/**
 * Valida CPF
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;

  // Validação básica (todos iguais)
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validação dos dígitos verificadores
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }

  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleaned[9]) !== digit) return false;

  sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }

  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cleaned[10]) === digit;
}
