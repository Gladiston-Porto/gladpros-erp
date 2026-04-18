import { z } from 'zod'

// Validações base
// Validações base
const zipCodeRegex = /^\d{5}(-\d{4})?$/ // Strict: 5 digits optionally followed by -4 digits
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validações para mercado americano
const ssnRegex = /^\d{3}-\d{2}-\d{4}$|^\d{9}$/ // Format: 123-45-6789 or 123456789
const itinRegex = /^9\d{2}-\d{2}-\d{4}$|^9\d{8}$/ // ITIN starts with 9, format: 9XX-XX-XXXX
const einRegex = /^\d{2}-\d{7}$|^\d{9}$/ // Format: 12-3456789 or 123456789

// Utils to normalize empty strings to null
const nullIfBlank = (v: unknown) => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t.length ? t : null;
};

// Schema para criação de cliente
export const clienteCreateSchema = z.object({
  tipo: z.enum(['PF', 'PJ'], {
    message: 'Tipo deve ser PF ou PJ'
  }),

  // Campos condicionais baseados no tipo (Trimmed)
  // Revertido min(5) para min(1) a pedido do usuário (nomes curtos como Ana/Leo são válidos)
  nomeCompleto: z.string().trim().min(1, 'Nome completo é obrigatório').max(255).optional().nullable(),
  razaoSocial: z.string().trim().max(255).optional().nullable(),
  nomeFantasia: z.string().trim().max(255).optional().nullable(),

  // Campos obrigatórios
  email: z.string()
    .trim()
    .min(1, 'E-mail é obrigatório')
    .max(255)
    .regex(emailRegex, 'E-mail deve ter formato válido')
    .transform(v => v.toLowerCase()),
  // ... (rest of create schema unchanged until explicit next edit needed, but using Start/End to surgically fix regex and min len)


  // Telefone: aceitar input formatado, normalizar para apenas dígitos e exigir formato americano (10 dígitos)
  telefone: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return v
    if (typeof v === 'string') return v.replace(/\D/g, '')
    return v
  }, z.string().min(1, 'Telefone é obrigatório').regex(/^\d{10}$/, 'Telefone deve ter 10 dígitos. Exemplo: (469)334-6918')),

  // Campos para mercado americano
  tipoDocumentoPF: z.enum(['SSN', 'ITIN']).optional().nullable(),
  ssn: z.preprocess(nullIfBlank, z.string().regex(ssnRegex, 'SSN deve ter formato válido (123-45-6789)').nullable().optional()),
  itin: z.preprocess(nullIfBlank, z.string().regex(itinRegex, 'ITIN deve ter formato válido (9XX-XX-XXXX)').nullable().optional()),
  ein: z.preprocess(nullIfBlank, z.string().regex(einRegex, 'EIN deve ter formato válido (12-3456789)').nullable().optional()),

  // Endereço (US Standard) - Strict Validation
  addressStreet: z.string().trim().min(1, 'Logradouro/Street é obrigatório').max(255),
  addressUnit: z.preprocess(nullIfBlank, z.string().max(50).nullable().optional()),
  addressCity: z.string().trim().min(1, 'Cidade é obrigatória').max(100),
  addressState: z.string().trim().transform(v => v.toUpperCase()).refine(v => /^[A-Z]{2}$/.test(v), 'Estado inválido (2 letras, ex: TX)'),
  addressZip: z.string().trim().min(1, 'ZIP Code é obrigatório').regex(zipCodeRegex, 'ZIP inválido (ex: 75201 ou 75201-1234)').max(20),
  addressCounty: z.preprocess(nullIfBlank, z.string().max(100).nullable().optional()),

  // Deprecated support (optional - kept for backward compat but effectively ignored by new logic)
  endereco: z.string().max(255).optional().nullable(),
  apartamentoUnidade: z.string().max(255).optional().nullable(),
  observacoes: z.preprocess(nullIfBlank, z.string().max(1000).nullable().optional())
}).superRefine((data, ctx) => {
  if (data.tipo === 'PF') {
    if (!data.nomeCompleto || data.nomeCompleto.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nome completo é obrigatório para Pessoa Física',
        path: ['nomeCompleto']
      })
    }
  } else {
    // PJ
    if (!data.nomeFantasia || data.nomeFantasia.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nome Fantasia é obrigatório para Empresa',
        path: ['nomeFantasia']
      })
    }
  }
}).superRefine((data, ctx) => {
  if (data.tipo === 'PF' && data.tipoDocumentoPF) {
    if (data.tipoDocumentoPF === 'SSN' && data.ssn) {
      if (!/^\d{3}-\d{2}-\d{4}$|^\d{9}$/.test(data.ssn)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SSN inválido',
          path: ['ssn']
        })
      }
    }
    if (data.tipoDocumentoPF === 'ITIN' && data.itin) {
      if (!/^9\d{2}-\d{2}-\d{4}$|^9\d{8}$/.test(data.itin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ITIN inválido',
          path: ['itin']
        })
      }
    }
  }
  if (data.tipo === 'PJ' && data.ein) {
    if (!/^\d{2}-\d{7}$|^\d{9}$/.test(data.ein)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'EIN inválido',
        path: ['ein']
      })
    }
  }
})

// Schema para atualização (todos os campos opcionais exceto tipo)
export const clienteUpdateSchema = z.object({
  id: z.number().optional(),
  tipo: z.enum(['PF', 'PJ']).optional(),
  ativo: z.boolean().optional(),

  nomeCompleto: z.string().trim().max(255).optional().nullable(),
  razaoSocial: z.string().trim().max(255).optional().nullable(),
  nomeFantasia: z.string().trim().max(255).optional().nullable(),

  email: z.string().trim().max(255).regex(emailRegex, 'E-mail deve ter formato válido').transform(v => v.toLowerCase()).optional(),

  telefone: z.preprocess((v) => {
    if (!v) return undefined;
    if (typeof v === 'string') return v.replace(/\D/g, '');
    return v;
  }, z.string().regex(/^\d{10}$/, 'Telefone deve ter 10 dígitos').optional()),

  tipoDocumentoPF: z.enum(['SSN', 'ITIN']).optional().nullable(),
  ssn: z.preprocess(nullIfBlank, z.string().regex(ssnRegex).nullable().optional()),
  itin: z.preprocess(nullIfBlank, z.string().regex(itinRegex).nullable().optional()),
  ein: z.preprocess(nullIfBlank, z.string().regex(einRegex).nullable().optional()),

  // Address Update Partial Validation
  addressStreet: z.string().trim().min(1, 'Logradouro não pode ser vazio').max(255).optional(),
  addressUnit: z.preprocess(nullIfBlank, z.string().max(50).nullable().optional()),
  addressCity: z.string().trim().min(1, 'Cidade não pode ser vazia').max(100).optional(),
  addressState: z.string().trim().transform(v => v?.toUpperCase()).refine(v => !v || /^[A-Z]{2}$/.test(v)).optional(),
  addressZip: z.string().trim().regex(zipCodeRegex).max(20).optional(),
  addressCounty: z.preprocess(nullIfBlank, z.string().max(100).nullable().optional()),

  endereco: z.string().max(255).optional(),
  apartamentoUnidade: z.string().max(255).optional().nullable(),
  observacoes: z.string().max(1000).optional().nullable(),
}).refine(() => {
  // Mantemos refine simples aqui pois update é parcial, dificil exigir campos cruzados sem saber o estado atual.
  // A validação de 'nome obrigatório' no update só faz sentido se o usuário estiver tentando LIMPAR o nome.
  // Como as strings são opcionais, se ele mandar "", vira null. Se virar null, o sistema deve impedir SE for o campo chave.
  // Mas isso é regra de negocio complexa pra Zod isolado (precisa do banco).
  return true
})

// Schema para filtros
export const clienteFiltersSchema = z.object({
  q: z.string().optional(),
  tipo: z.enum(['PF', 'PJ', 'all']).optional().default('all'),
  ativo: z.union([
    z.literal('all'),
    z.enum(['true', 'false']).transform(val => val === 'true')
  ]).optional().default('all'),
  addressCity: z.string().trim().max(100).optional(),
  addressState: z.string().trim().max(2).optional(),
  addressCounty: z.string().trim().max(100).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(2000).optional().default(12),
  sortKey: z.enum(['nome', 'tipo', 'email', 'telefone', 'documento', 'cidadeEstado', 'status', 'criadoEm']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional()
})

// Schema para parâmetros de rota
export const clienteParamsSchema = z.object({
  id: z.coerce.number().int().positive()
})

// Tipos inferidos dos schemas
export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
export type ClienteFiltersInput = z.infer<typeof clienteFiltersSchema>
export type ClienteParamsInput = z.infer<typeof clienteParamsSchema>

// Schema para resposta da API
export const clienteResponseSchema = z.object({
  id: z.number(),
  tipo: z.enum(['PF', 'PJ']),
  nomeCompletoOuRazao: z.string(),
  email: z.string(),
  telefone: z.string(),

  // Legacy fields (Opcionais para não quebrar API que não retorna, mas mantidos no schema)
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  zipcode: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),

  // Novos campos de endereço completos
  addressStreet: z.string().nullable().optional(),
  addressUnit: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZip: z.string().nullable().optional(),
  addressCounty: z.string().nullable().optional(),

  documentoMasked: z.string(),
  ativo: z.boolean(),
  criadoEm: z.string(),
  atualizadoEm: z.string()
})

export const clienteListResponseSchema = z.object({
  data: z.array(clienteResponseSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number()
})
