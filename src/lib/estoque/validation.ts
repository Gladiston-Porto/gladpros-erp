/**
 * VALIDAÇÃO Zod - Módulo Estoque
 * 
 * Schemas Zod para formulários e API requests
 */

import { z } from 'zod';

// ============================================================================
// HELPERS
// ============================================================================

const positiveNumber = z.number().positive('Deve ser um número positivo');
const nonNegativeNumber = z.number().min(0, 'Deve ser maior ou igual a zero');
const requiredString = z.string().min(1, 'Campo obrigatório');
const optionalString = z.string().optional();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato: YYYY-MM-DD)');

// ============================================================================
// MATERIAL
// ============================================================================

export const materialSchema = z.object({
  codigo: requiredString.max(50),
  nome: requiredString.max(150),
  descricao: optionalString,
  categoriaId: z.number().int().positive().optional(),
  unidadeId: z.number().int().positive(),
  fabricante: z.string().max(100).optional(),
  modelo: z.string().max(80).optional(),
  ncm: z.string().regex(/^\d{8}$/, 'NCM deve ter 8 dígitos').optional(),
  pesoUnitario: positiveNumber.optional(),
  dimensoes: z.string().max(100).optional(),
  fotoUrl: z.string().url('URL inválida').optional(),
  // Novos campos: UPC/Barcode
  barcodeInternal: z.string().max(60).optional(),
  atributos: z.record(z.string(), z.any()).optional(), // JSON flexível
  estoqueMinimo: nonNegativeNumber,
  pontoReposicao: nonNegativeNumber,
  rastreioLote: z.boolean(),
  possuiValidade: z.boolean(),
}).refine(
  data => data.pontoReposicao >= data.estoqueMinimo,
  { message: 'Ponto de reposição deve ser maior ou igual ao estoque mínimo', path: ['pontoReposicao'] }
);

// ============================================================================
// MATERIAL EMBALAGEM (UPC/EAN)
// ============================================================================

export const materialEmbalagemSchema = z.object({
  upcEan: z.string().max(20).optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(80).optional(),
  packageType: z.string().min(1, 'Tipo de embalagem é obrigatório').max(30),
  baseQtyPerUnit: z.number().positive('Quantidade base deve ser maior que 0'),
  purchaseUnit: z.string().max(10).default('EA'),
  precoCompra: z.number().positive('Preço deve ser maior que 0').optional(),
});

export type MaterialEmbalagemInput = z.infer<typeof materialEmbalagemSchema>;

// ============================================================================
// EQUIPAMENTO
// ============================================================================


export const equipamentoSchema = z.object({
  codigo: requiredString.max(50),
  nome: requiredString.max(200),
  tipo: z.enum([
    'FERRAMENTA_MANUAL',
    'FERRAMENTA_ELETRICA',
    'EQUIPAMENTO_MEDICAO',
    'EQUIPAMENTO_SEGURANCA',
    'ANDAIME',
    'ESCADA',
    'VEICULO',
    'OUTRO'
  ]),
  categoriaId: z.number().int().positive().optional(),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  numeroSerie: z.string().max(100).optional(),
  anoFabricacao: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  dataAquisicao: dateString,
  valorAquisicao: positiveNumber,
  fornecedorId: z.number().int().positive().optional(),
  notaFiscal: z.string().max(50).optional(),
  requerCalibracao: z.boolean(),
  periodicidadeCalibracaoDias: z.number().int().positive().optional(),
  requerManutencaoPeriodica: z.boolean(),
  periodicidadeManutencaoDias: z.number().int().positive().optional(),
  fotoUrl: z.string().url('URL inválida').optional(),
  manualUrl: z.string().url('URL inválida').optional(),
  observacoes: optionalString,
}).refine(
  data => !data.requerCalibracao || data.periodicidadeCalibracaoDias,
  { message: 'Equipamento com calibração requer periodicidade', path: ['periodicidadeCalibracaoDias'] }
).refine(
  data => !data.requerManutencaoPeriodica || data.periodicidadeManutencaoDias,
  { message: 'Equipamento com manutenção periódica requer periodicidade', path: ['periodicidadeManutencaoDias'] }
);

// ============================================================================
// MOVIMENTAÇÃO
// ============================================================================

export const movimentacaoSchema = z.object({
  tipo: z.enum([
    'ENTRADA',
    'SAIDA',
    'TRANSFERENCIA',
    'AJUSTE_POSITIVO',
    'AJUSTE_NEGATIVO',
    'RESERVA',
    'CANCELAMENTO_RESERVA',
    'DEVOLUCAO',
    'PERDA'
  ], { message: 'Tipo obrigatório' }),
  materialId: z.number().int().positive(),
  loteId: z.number().int().positive().optional(),
  localizacaoOrigemId: z.number().int().positive().optional(),
  localizacaoDestinoId: z.number().int().positive().optional(),
  quantidade: positiveNumber,
  custoUnitario: positiveNumber.optional(),
  projetoId: z.number().int().positive().optional(),
  motivo: optionalString,
  referenciaExterna: z.string().max(100).optional(),
}).superRefine((data, ctx) => {
  // TRANSFERENCIA requer origem e destino
  if (data.tipo === 'TRANSFERENCIA') {
    if (!data.localizacaoOrigemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Localização de origem obrigatória para transferência',
        path: ['localizacaoOrigemId']
      });
    }
    if (!data.localizacaoDestinoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Localização de destino obrigatória para transferência',
        path: ['localizacaoDestinoId']
      });
    }
  }

  // ENTRADA requer destino e custo
  if (data.tipo === 'ENTRADA') {
    if (!data.localizacaoDestinoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Localização de destino obrigatória para entrada',
        path: ['localizacaoDestinoId']
      });
    }
    if (!data.custoUnitario) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custo unitário obrigatório para entrada',
        path: ['custoUnitario']
      });
    }
  }

  // SAIDA/RESERVA requer origem
  if (['SAIDA', 'RESERVA'].includes(data.tipo)) {
    if (!data.localizacaoOrigemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Localização de origem obrigatória',
        path: ['localizacaoOrigemId']
      });
    }
  }

  // PERDA requer motivo
  if (data.tipo === 'PERDA' && !data.motivo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Motivo obrigatório para perdas',
      path: ['motivo']
    });
  }
});

// ============================================================================
// RESERVA DE MATERIAL
// ============================================================================

export const reservaMaterialSchema = z.object({
  projetoId: z.number().int().positive(),
  materialId: z.number().int().positive(),
  loteId: z.number().int().positive().optional(),
  quantidade: positiveNumber,
  observacoes: optionalString,
});

// ============================================================================
// ALOCAÇÃO DE EQUIPAMENTO
// ============================================================================

export const alocacaoEquipamentoSchema = z.object({
  projetoId: z.number().int().positive(),
  equipamentoId: z.number().int().positive(),
  responsavelId: z.number().int().positive(),
  dataDevolucaoPrevista: dateString.optional(),
  condicaoSaida: z.enum(['EXCELENTE', 'BOM', 'REGULAR', 'RUIM'], {
    message: 'Condição de saída obrigatória'
  }),
  condicaoSaidaObs: optionalString,
  custoDiaria: nonNegativeNumber.optional(),
  cobrarCliente: z.boolean(),
  observacoes: optionalString,
});

// ============================================================================
// DEVOLUÇÃO DE EQUIPAMENTO
// ============================================================================

export const devolucaoEquipamentoSchema = z.object({
  condicaoRetorno: z.enum(['EXCELENTE', 'BOM', 'REGULAR', 'RUIM'], {
    message: 'Condição de retorno obrigatória'
  }),
  condicaoRetornoObs: optionalString,
  verificadoPor: z.number().int().positive(),
}).refine(
  data => data.condicaoRetorno === 'EXCELENTE' || data.condicaoRetornoObs,
  {
    message: 'Observação obrigatória para equipamentos não devolvidos em condição excelente',
    path: ['condicaoRetornoObs']
  }
);

// ============================================================================
// MANUTENÇÃO
// ============================================================================

export const manutencaoSchema = z.object({
  equipamentoId: z.number().int().positive(),
  tipo: z.enum([
    'PREVENTIVA',
    'CORRETIVA',
    'CALIBRACAO',
    'INSPECAO'
  ], { message: 'Tipo obrigatório' }),
  dataInicio: dateString,
  dataConclusao: dateString.optional(),
  fornecedorId: z.number().int().positive().optional(),
  custo: positiveNumber.optional(),
  notaFiscal: z.string().max(50).optional(),
  descricao: requiredString,
  servicosRealizados: optionalString,
  pecasTrocadas: optionalString,
  proximaManutencao: dateString.optional(),
  proximaCalibracao: dateString.optional(),
}).refine(
  data => !data.dataConclusao || data.dataConclusao >= data.dataInicio,
  { message: 'Data de conclusão deve ser posterior à data de início', path: ['dataConclusao'] }
);

// ============================================================================
// COMPRA
// ============================================================================

export const compraSchema = z.object({
  tipo: z.enum(['MATERIAL', 'EQUIPAMENTO', 'MISTO'], { message: 'Tipo obrigatório' }),
  fornecedorId: z.number().int().positive(),
  projetoId: z.number().int().positive().optional(),
  numeroOC: z.string().max(50).optional(),
  dataPedido: dateString,
  dataEntregaPrevista: dateString,
  dataEntregaReal: dateString.optional(),
  observacoes: optionalString,
  itens: z.array(z.object({
    tipo: z.enum(['MATERIAL', 'EQUIPAMENTO']),
    materialId: z.number().int().positive().optional(),
    equipamentoId: z.number().int().positive().optional(),
    quantidade: positiveNumber,
    valorUnitario: positiveNumber,
    desconto: nonNegativeNumber.optional().default(0),
    impostos: nonNegativeNumber.optional().default(0),
    observacoes: optionalString,
  })).min(1, 'Ao menos um item obrigatório'),
}).superRefine((data, ctx) => {
  // Validar itens
  data.itens.forEach((item, idx) => {
    if (item.tipo === 'MATERIAL' && !item.materialId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Material obrigatório para itens do tipo MATERIAL',
        path: ['itens', idx, 'materialId']
      });
    }
    if (item.tipo === 'EQUIPAMENTO' && !item.equipamentoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Equipamento obrigatório para itens do tipo EQUIPAMENTO',
        path: ['itens', idx, 'equipamentoId']
      });
    }
  });

  // Data de entrega prevista >= data de pedido
  if (data.dataEntregaPrevista < data.dataPedido) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Data de entrega prevista deve ser posterior à data do pedido',
      path: ['dataEntregaPrevista']
    });
  }
});

// ============================================================================
// FILTROS
// ============================================================================

export const materialFilterSchema = z.object({
  codigo: optionalString,
  nome: optionalString,
  categoriaId: z.number().int().positive().optional(),
  ativo: z.boolean().optional(),
  baixoEstoque: z.boolean().optional(),
});

export const equipamentoFilterSchema = z.object({
  codigo: optionalString,
  nome: optionalString,
  tipo: z.string().optional(),
  status: z.string().optional(),
  categoriaId: z.number().int().positive().optional(),
  projetoId: z.number().int().positive().optional(),
  ativo: z.boolean().optional(),
});

export const movimentacaoFilterSchema = z.object({
  materialId: z.number().int().positive().optional(),
  projetoId: z.number().int().positive().optional(),
  tipo: z.string().optional(),
  dataInicio: dateString.optional(),
  dataFim: dateString.optional(),
});

export const alertaFilterSchema = z.object({
  tipo: z.string().optional(),
  prioridade: z.string().optional(),
  ativo: z.boolean().optional(),
  materialId: z.number().int().positive().optional(),
  equipamentoId: z.number().int().positive().optional(),
  projetoId: z.number().int().positive().optional(),
});

// ============================================================================
// PAGINAÇÃO
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
