/**
 * Validadores Zod para o módulo Projetos
 * Validação de entrada de dados com mensagens em português
 * Compatível com Zod v3 (padrão do projeto)
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS DE ENUMS
// ============================================================================

const projetoStatusSchema = z.enum([
  'planejado',
  'em_execucao',
  'em_inspecao',
  'aguardando_devolucoes',
  'concluido',
  'arquivado',
  'suspenso',
  'cancelado',
]);

const projetoPrioridadeSchema = z.enum(['baixa', 'media', 'alta', 'critica']);

const etapaStatusSchema = z.enum([
  'pendente',
  'em_andamento',
  'em_validacao',
  'concluida',
  'bloqueada',
  'cancelada',
]);

const materialStatusSchema = z.enum([
  'planejado',
  'liberado',
  'em_uso',
  'devolucao_pendente',
  'triagem_pendente',
  'finalizado',
]);

const tarefaStatusSchema = z.enum([
  'aberta',
  'em_andamento',
  'bloqueada',
  'concluida',
  'cancelada',
]);

// ============================================================================
// PROJETO - VALIDADORES
// ============================================================================

export const createProjetoSchema = z.object({
  titulo: z
    .string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  
  descricao: z
    .string()
    .max(5000, "Descrição deve ter no máximo 5000 caracteres")
    .nullish(),
  
  clienteId: z
    .number()
    .int("ID do cliente deve ser um número inteiro")
    .positive("ID do cliente deve ser positivo"),
  
  propostaId: z
    .number()
    .int("ID da proposta deve ser um número inteiro")
    .positive("ID da proposta deve ser positivo")
    .nullish(),
  
  responsavelId: z
    .number()
    .int("ID do responsável deve ser um número inteiro")
    .positive("ID do responsável deve ser positivo")
    .nullish(),
  
  prioridade: projetoPrioridadeSchema.default('media'),
  
  dataInicio: z
    .union([z.date(), z.string().datetime()])
    .nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  
  dataPrevisao: z
    .union([z.date(), z.string().datetime()])
    .nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  
  valorOrcado: z
    .number()
    .nonnegative("Valor orçado deve ser não-negativo")
    .nullish(),
  
  observacoes: z
    .string()
    .max(2000, "Observações devem ter no máximo 2000 caracteres")
    .nullish(),
});

export const updateProjetoSchema = z.object({
  titulo: z
    .string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .optional(),
  
  descricao: z
    .string()
    .max(5000, "Descrição deve ter no máximo 5000 caracteres")
    .nullish(),
  
  responsavelId: z
    .number()
    .int()
    .positive()
    .nullish(),
  
  prioridade: projetoPrioridadeSchema.optional(),
  
  dataInicio: z
    .union([z.date(), z.string().datetime()])
    .nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  
  dataPrevisao: z
    .union([z.date(), z.string().datetime()])
    .nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  
  dataConclusao: z
    .union([z.date(), z.string().datetime()])
    .nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  
  valorOrcado: z.number().nonnegative().nullish(),
  valorRealizado: z.number().nonnegative().nullish(),
  observacoes: z.string().max(2000).nullish(),
});

export const alterarStatusProjetoSchema = z.object({
  novoStatus: projetoStatusSchema,
  observacao: z.string().max(500).optional(),
});

export const listarProjetosSchema = z.object({
  clienteId: z.coerce.number().int().positive().optional(),
  responsavelId: z.coerce.number().int().positive().optional(),
  status: z.union([projetoStatusSchema, z.array(projetoStatusSchema)]).optional(),
  prioridade: z.union([projetoPrioridadeSchema, z.array(projetoPrioridadeSchema)]).optional(),
  dataInicioMin: z.coerce.date().optional(),
  dataInicioMax: z.coerce.date().optional(),
  dataPrevisaoMin: z.coerce.date().optional(),
  dataPrevisaoMax: z.coerce.date().optional(),
  busca: z.string().max(200).optional(),
  ordenarPor: z.enum(['dataInicio', 'dataPrevisao', 'prioridade', 'status', 'titulo']).optional(),
  ordenarDirecao: z.enum(['asc', 'desc']).default('desc'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// ETAPA - VALIDADORES
// ============================================================================

export const createProjetoEtapaSchema = z.object({
  projetoId: z.number().int().positive(),
  ordem: z.number().int().nonnegative(),
  servico: z.string().min(3, "Serviço deve ter no mínimo 3 caracteres").max(200),
  descricao: z.string().max(2000).nullish(),
  inicioPrevisto: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  fimPrevisto: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
});

export const updateProjetoEtapaSchema = z.object({
  ordem: z.number().int().nonnegative().optional(),
  servico: z.string().min(3).max(200).optional(),
  descricao: z.string().max(2000).nullish(),
  inicioPrevisto: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  fimPrevisto: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  dataConclusao: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  percentualConclusao: z.number().min(0).max(100).optional(),
  observacoes: z.string().max(1000).nullish(),
});

export const alterarStatusEtapaSchema = z.object({
  novoStatus: etapaStatusSchema,
  observacao: z.string().max(500).optional(),
});

// ============================================================================
// MATERIAL - VALIDADORES
// ============================================================================

export const createProjetoMaterialSchema = z.object({
  projetoId: z.number().int().positive(),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(500),
  quantidadePlanejada: z.number().positive("Quantidade deve ser positiva"),
  unidade: z.string().min(1, "Unidade é obrigatória").max(50),
});

export const updateProjetoMaterialSchema = z.object({
  nome: z.string().min(3).max(500).optional(),
  quantidadePlanejada: z.number().positive().optional(),
  unidade: z.string().min(1).max(50).optional(),
});

export const alterarStatusMaterialSchema = z.object({
  novoStatus: materialStatusSchema,
  observacao: z.string().max(500).optional(),
});

// ============================================================================
// TAREFA - VALIDADORES
// ============================================================================

export const createProjetoTarefaSchema = z.object({
  projetoId: z.number().int().positive(),
  etapaId: z.number().int().positive().nullish(),
  titulo: z.string().min(3, "Título deve ter no mínimo 3 caracteres").max(200),
  descricao: z.string().max(2000).nullish(),
  prioridade: projetoPrioridadeSchema.default('media'),
  responsavelId: z.number().int().positive().nullish(),
  dataPrevista: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  observacoes: z.string().max(1000).nullish(),
});

export const updateProjetoTarefaSchema = z.object({
  etapaId: z.number().int().positive().nullish(),
  titulo: z.string().min(3).max(200).optional(),
  descricao: z.string().max(2000).nullish(),
  prioridade: projetoPrioridadeSchema.optional(),
  responsavelId: z.number().int().positive().nullish(),
  dataPrevista: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  dataConclusao: z.union([z.date(), z.string().datetime()]).nullish()
    .transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : null),
  observacoes: z.string().max(1000).nullish(),
});

export const alterarStatusTarefaSchema = z.object({
  novoStatus: tarefaStatusSchema,
  observacao: z.string().max(500).optional(),
});

// ============================================================================
// ANEXO - VALIDADORES
// ============================================================================

export const createProjetoAnexoSchema = z.object({
  projetoId: z.number().int().positive(),
  arquivoUrl: z.string().min(1, "URL do arquivo é obrigatória").max(500),
  rotulo: z.string().max(150).nullish(),
  publicoCliente: z.boolean().default(true),
});

// ============================================================================
// HISTÓRICO - VALIDADORES
// ============================================================================

export const listarHistoricoSchema = z.object({
  projetoId: z.coerce.number().int().positive(),
  acoes: z.array(z.string()).optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================================================
// VALIDADORES DE ID/PARAMS
// ============================================================================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const numeroprojetoParamSchema = z.object({
  numeroProjeto: z.string().regex(/^PRJ-\d{4}-\d{4}$/, "Formato inválido (esperado: PRJ-AAAA-NNNN)"),
});

// ============================================================================
// EXPORTS DE SCHEMAS DE ENUMS
// ============================================================================

export {
  projetoStatusSchema,
  projetoPrioridadeSchema,
  etapaStatusSchema,
  materialStatusSchema,
  tarefaStatusSchema,
};
