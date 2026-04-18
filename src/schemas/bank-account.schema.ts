/**
 * SCHEMAS ZOD - MÓDULO CONTAS BANCÁRIAS
 * 
 * Validações para:
 * - Contas bancárias (CRUD)
 * - Transações (lançamentos)
 * - Transferências entre contas
 * - Reconciliação bancária
 * - Filtros e consultas
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const TipoContaEnum = z.enum([
  "CORRENTE",
  "POUPANCA",
  "INVESTIMENTO",
  "CAIXA",
  "CARTEIRA_DIGITAL"
]);

export const TipoTransacaoEnum = z.enum([
  "CREDITO",
  "DEBITO",
  "TRANSFERENCIA_ENTRADA",
  "TRANSFERENCIA_SAIDA",
  "TAXA",
  "JUROS",
  "ESTORNO"
]);

export const StatusTransferenciaEnum = z.enum([
  "PENDENTE",
  "PROCESSANDO",
  "CONCLUIDA",
  "CANCELADA",
  "FALHOU",
  "ESTORNADA"
]);

// ============================================================================
// SCHEMAS - CONTA BANCÁRIA
// ============================================================================

/**
 * Schema para criar nova conta bancária
 */
export const createBankAccountSchema = z.object({
  empresaId: z.number().int().positive({
    message: "ID da empresa é obrigatório"
  }),
  
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  
  banco: z.string()
    .min(2, "Nome do banco é obrigatório")
    .max(100, "Nome do banco muito longo"),
  
  agencia: z.string()
    .min(1, "Número da agência é obrigatório")
    .max(20, "Número da agência muito longo")
    .regex(/^\d+(-\d+)?$/, "Formato de agência inválido (use apenas números e hífen)"),
  
  conta: z.string()
    .min(1, "Número da conta é obrigatório")
    .max(20, "Número da conta muito longo")
    .regex(/^\d+$/, "Número da conta deve conter apenas dígitos"),
  
  digito: z.string()
    .max(2, "Dígito verificador muito longo")
    .regex(/^\d+$/, "Dígito deve conter apenas números")
    .optional()
    .nullable(),
  
  tipo: TipoContaEnum.default("CORRENTE"),
  
  saldoInicial: z.number()
    .or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), "Saldo inicial deve ser um número")
    .transform(val => Number(val))
    .default(0),
  
  limiteCredito: z.number()
    .or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), "Limite de crédito deve ser um número")
    .refine(val => val > 0, "Limite deve ser maior que zero")
    .transform(val => Number(val))
    .optional()
    .nullable(),
  
  principal: z.boolean().default(false),
  
  observacoes: z.string()
    .max(1000, "Observações muito longas")
    .optional()
    .nullable(),
  
  metadata: z.record(z.string(), z.any()).optional().nullable()
});

/**
 * Schema para atualizar conta bancária existente
 */
export const updateBankAccountSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  
  banco: z.string()
    .min(2, "Nome do banco é obrigatório")
    .max(100, "Nome do banco muito longo")
    .optional(),
  
  agencia: z.string()
    .max(20, "Número da agência muito longo")
    .regex(/^\d+(-\d+)?$/, "Formato de agência inválido")
    .optional(),
  
  conta: z.string()
    .max(20, "Número da conta muito longo")
    .regex(/^\d+$/, "Número da conta deve conter apenas dígitos")
    .optional(),
  
  digito: z.string()
    .max(2, "Dígito verificador muito longo")
    .regex(/^\d+$/, "Dígito deve conter apenas números")
    .optional()
    .nullable(),
  
  tipo: TipoContaEnum.optional(),
  
  limiteCredito: z.number()
    .or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), "Limite de crédito deve ser um número")
    .refine(val => val > 0, "Limite deve ser maior que zero")
    .transform(val => Number(val))
    .optional()
    .nullable(),
  
  ativo: z.boolean().optional(),
  
  principal: z.boolean().optional(),
  
  observacoes: z.string()
    .max(1000, "Observações muito longas")
    .optional()
    .nullable(),
  
  metadata: z.record(z.string(), z.any()).optional().nullable()
});

// ============================================================================
// SCHEMAS - TRANSAÇÃO BANCÁRIA
// ============================================================================

/**
 * Schema para criar nova transação
 */
export const createBankTransactionSchema = z.object({
  accountId: z.number().int().positive({
    message: "ID da conta é obrigatório"
  }),
  
  empresaId: z.number().int().positive({
    message: "ID da empresa é obrigatório"
  }),
  
  tipo: TipoTransacaoEnum,
  
  categoria: z.string()
    .max(100, "Categoria muito longa")
    .optional()
    .nullable(),
  
  valor: z.number()
    .or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), "Valor deve ser um número")
    .refine(val => val > 0, "Valor deve ser maior que zero")
    .transform(val => Number(val)),
  
  descricao: z.string()
    .min(3, "Descrição deve ter no mínimo 3 caracteres")
    .max(255, "Descrição muito longa"),
  
  documento: z.string()
    .max(100, "Número do documento muito longo")
    .optional()
    .nullable(),
  
  dataTransacao: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    }),
  
  revenueId: z.number().int().positive().optional().nullable(),
  expenseId: z.number().int().positive().optional().nullable(),
  
  comprovante: z.string()
    .url("URL do comprovante inválida")
    .max(500)
    .optional()
    .nullable(),
  
  observacoes: z.string()
    .max(1000, "Observações muito longas")
    .optional()
    .nullable(),
  
  metadata: z.record(z.string(), z.any()).optional().nullable()
});

/**
 * Schema para reconciliar transações
 */
export const reconcileBankTransactionsSchema = z.object({
  transactionIds: z.array(z.number().int().positive())
    .min(1, "Selecione pelo menos uma transação"),
  
  dataReconciliacao: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    })
    .optional()
});

// ============================================================================
// SCHEMAS - TRANSFERÊNCIA BANCÁRIA
// ============================================================================

/**
 * Schema para criar nova transferência
 */
export const createBankTransferSchema = z.object({
  empresaId: z.number().int().positive({
    message: "ID da empresa é obrigatório"
  }),
  
  fromAccountId: z.number().int().positive({
    message: "Conta de origem é obrigatória"
  }),
  
  toAccountId: z.number().int().positive({
    message: "Conta de destino é obrigatória"
  }),
  
  valor: z.number()
    .or(z.string().transform(val => parseFloat(val)))
    .refine(val => !isNaN(val), "Valor deve ser um número")
    .refine(val => val > 0, "Valor deve ser maior que zero")
    .transform(val => Number(val)),
  
  descricao: z.string()
    .min(3, "Descrição deve ter no mínimo 3 caracteres")
    .max(255, "Descrição muito longa"),
  
  dataAgendamento: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    })
    .optional(),
  
  observacoes: z.string()
    .max(1000, "Observações muito longas")
    .optional()
    .nullable(),
  
  metadata: z.record(z.string(), z.any()).optional().nullable()
}).refine(
  (data) => data.fromAccountId !== data.toAccountId,
  {
    message: "Conta de origem e destino não podem ser iguais",
    path: ["toAccountId"]
  }
);

/**
 * Schema para atualizar status de transferência
 */
export const updateTransferStatusSchema = z.object({
  status: StatusTransferenciaEnum,
  
  ultimaResposta: z.string()
    .max(1000)
    .optional()
    .nullable(),
  
  processadoPor: z.number().int().positive().optional().nullable(),
  
  comprovante: z.string()
    .url("URL do comprovante inválida")
    .max(500)
    .optional()
    .nullable()
});

/**
 * Schema para executar transferência pendente
 */
export const executeTransferSchema = z.object({
  transferId: z.number().int().positive(),
  processadoPor: z.number().int().positive()
});

// ============================================================================
// SCHEMAS - FILTROS E CONSULTAS
// ============================================================================

/**
 * Schema para filtros de contas bancárias
 */
export const bankAccountFiltersSchema = z.object({
  empresaId: z.number().int().positive().optional(),
  tipo: TipoContaEnum.optional(),
  ativo: z.boolean().optional(),
  principal: z.boolean().optional(),
  banco: z.string().optional(),
  search: z.string().optional()
});

/**
 * Schema para filtros de transações
 */
export const bankTransactionFiltersSchema = z.object({
  accountId: z.number().int().positive().optional(),
  empresaId: z.number().int().positive().optional(),
  tipo: TipoTransacaoEnum.optional(),
  categoria: z.string().optional(),
  reconciliada: z.boolean().optional(),
  
  dataInicio: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    })
    .optional(),
  
  dataFim: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    })
    .optional(),
  
  valorMin: z.number()
    .or(z.string().transform(val => parseFloat(val)))
    .optional(),
  
  valorMax: z.number()
    .or(z.string().transform(val => parseFloat(val)))
    .optional(),
  
  search: z.string().optional(),
  
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50)
});

/**
 * Schema para filtros de transferências
 */
export const bankTransferFiltersSchema = z.object({
  empresaId: z.number().int().positive().optional(),
  fromAccountId: z.number().int().positive().optional(),
  toAccountId: z.number().int().positive().optional(),
  status: StatusTransferenciaEnum.optional(),
  
  dataInicio: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    })
    .optional(),
  
  dataFim: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    })
    .optional(),
  
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50)
});

/**
 * Schema para consulta de extrato
 */
export const bankStatementSchema = z.object({
  accountId: z.number().int().positive(),
  
  dataInicio: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    }),
  
  dataFim: z.string()
    .or(z.date())
    .transform((val) => {
      if (val instanceof Date) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) throw new Error("Data inválida");
      return date;
    }),
  
  incluirReconciliadas: z.boolean().default(true),
  
  agruparPorCategoria: z.boolean().default(false)
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcula saldo após transação
 */
export function calcularSaldoPosterior(
  saldoAnterior: number,
  valor: number,
  tipo: z.infer<typeof TipoTransacaoEnum>
): number {
  const tiposCredito: Array<z.infer<typeof TipoTransacaoEnum>> = [
    "CREDITO",
    "TRANSFERENCIA_ENTRADA",
    "JUROS"
  ];
  
  const tiposDebito: Array<z.infer<typeof TipoTransacaoEnum>> = [
    "DEBITO",
    "TRANSFERENCIA_SAIDA",
    "TAXA"
  ];
  
  if (tiposCredito.includes(tipo)) {
    return saldoAnterior + valor;
  } else if (tiposDebito.includes(tipo)) {
    return saldoAnterior - valor;
  } else if (tipo === "ESTORNO") {
    // Estorno inverte o valor original
    return saldoAnterior + valor; // Assumindo que valor já vem com sinal correto
  }
  
  return saldoAnterior;
}

/**
 * Valida se conta tem saldo suficiente para transação
 */
export function validarSaldoDisponivel(
  saldoAtual: number,
  limiteCredito: number | null,
  valorTransacao: number,
  tipo: z.infer<typeof TipoTransacaoEnum>
): { valido: boolean; saldoDisponivel: number; mensagem?: string } {
  const saldoDisponivel = saldoAtual + (limiteCredito || 0);
  
  const tiposDebito: Array<z.infer<typeof TipoTransacaoEnum>> = [
    "DEBITO",
    "TRANSFERENCIA_SAIDA",
    "TAXA"
  ];
  
  // Só valida para operações de débito
  if (!tiposDebito.includes(tipo)) {
    return { valido: true, saldoDisponivel };
  }
  
  if (valorTransacao > saldoDisponivel) {
    return {
      valido: false,
      saldoDisponivel,
      mensagem: `Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}`
    };
  }
  
  return { valido: true, saldoDisponivel };
}

/**
 * Determina tipo de transação baseado em operação
 */
export function determinarTipoTransacao(
  operacao: "entrada" | "saida" | "transferencia_entrada" | "transferencia_saida"
): z.infer<typeof TipoTransacaoEnum> {
  const mapa = {
    entrada: "CREDITO" as const,
    saida: "DEBITO" as const,
    transferencia_entrada: "TRANSFERENCIA_ENTRADA" as const,
    transferencia_saida: "TRANSFERENCIA_SAIDA" as const
  };
  
  return mapa[operacao];
}

/**
 * Valida período de extrato
 */
export function validarPeriodoExtrato(
  dataInicio: Date,
  dataFim: Date
): { valido: boolean; mensagem?: string } {
  if (dataInicio > dataFim) {
    return {
      valido: false,
      mensagem: "Data inicial não pode ser maior que data final"
    };
  }
  
  const diferencaDias = Math.ceil(
    (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (diferencaDias > 365) {
    return {
      valido: false,
      mensagem: "Período máximo de extrato é 365 dias"
    };
  }
  
  return { valido: true };
}

/**
 * Formata número de conta para exibição
 */
export function formatarNumeroConta(
  agencia: string,
  conta: string,
  digito?: string | null
): string {
  if (digito) {
    return `${agencia} / ${conta}-${digito}`;
  }
  return `${agencia} / ${conta}`;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type CreateBankTransactionInput = z.infer<typeof createBankTransactionSchema>;
export type ReconcileBankTransactionsInput = z.infer<typeof reconcileBankTransactionsSchema>;
export type CreateBankTransferInput = z.infer<typeof createBankTransferSchema>;
export type UpdateTransferStatusInput = z.infer<typeof updateTransferStatusSchema>;
export type ExecuteTransferInput = z.infer<typeof executeTransferSchema>;
export type BankAccountFilters = z.infer<typeof bankAccountFiltersSchema>;
export type BankTransactionFilters = z.infer<typeof bankTransactionFiltersSchema>;
export type BankTransferFilters = z.infer<typeof bankTransferFiltersSchema>;
export type BankStatementInput = z.infer<typeof bankStatementSchema>;
