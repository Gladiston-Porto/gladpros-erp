/**
 * Schemas de Validação - Módulo Propostas
 *
 * Validações Zod para criação e atualização de propostas.
 * Espelha a estrutura de PropostaFormData (components/propostas/types.ts).
 */

import { z } from 'zod';

// ========================================
// ENUMS
// ========================================

export const StatusPropostaEnum = z.enum([
  'RASCUNHO',
  'ENVIADA',
  'ASSINADA',
  'APROVADA',
  'CANCELADA',
  'PENDENTE_APROVACAO',
  'REJEITADA',
]);

export const StatusPermiteEnum = z.enum([
  'SIM',
  'NAO',
  'NAO_NECESSARIO',
  'NECESSARIO',
  'OBTIDO',
]);

export const StatusMaterialEnum = z.enum([
  'necessario',
  'opcional',
  'substituivel',
]);

export const StatusEtapaEnum = z.enum([
  'planejada',
  'opcional',
  'removida',
]);

export const GatilhoFaturamentoEnum = z.enum([
  'na_aprovacao',
  'por_marcos',
  'na_entrega',
  'custom',
]);

// ========================================
// SUB-SCHEMAS
// ========================================

const clienteInfoSchema = z.object({
  id: z.string().min(1, 'ID do cliente é obrigatório'),
  contato_nome: z.string().min(1, 'Nome do contato é obrigatório'),
  contato_email: z.string().email('Email inválido'),
  contato_telefone: z.string().optional(),
  local_endereco: z.string().min(1, 'Endereço é obrigatório'),
  titulo: z.string().min(1, 'Título é obrigatório'),
});

const prazosInfoSchema = z.object({
  tempo_para_aceite: z.number().int().min(1, 'Tempo para aceite deve ser pelo menos 1 dia'),
  validade_proposta: z.string().min(1, 'Validade da proposta é obrigatório'),
  prazo_execucao_dias: z.number().int().min(1, 'Prazo de execução deve ser pelo menos 1 dia'),
  janela: z.string().optional(),
  restricoes: z.string().optional(),
});

const materialSchema = z.object({
  id: z.string(),
  codigo: z.string().min(1, 'Código do material é obrigatório'),
  nome: z.string().min(1, 'Nome do material é obrigatório'),
  quantidade: z.number().min(0, 'Quantidade deve ser >= 0'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  preco: z.number().optional(),
  status: StatusMaterialEnum,
  fornecedor: z.string().optional(),
  obs: z.string().optional(),
});

const etapaSchema = z.object({
  id: z.string(),
  servico: z.string().min(1, 'Serviço é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  quantidade: z.number().optional(),
  unidade: z.string().optional(),
  duracaoHoras: z.number().optional(),
  custoMO: z.number().optional(),
  status: StatusEtapaEnum,
});

const comerciaisInfoSchema = z.object({
  condicoes_pagamento: z.string().min(1, 'Condições de pagamento são obrigatórias'),
  garantia: z.string().min(1, 'Garantia é obrigatória'),
  exclusoes: z.string().min(1, 'Exclusões são obrigatórias'),
  condicoes_gerais: z.string().min(1, 'Condições gerais são obrigatórias'),
  desconto: z.number().min(0).max(100),
});

const internoInfoSchema = z.object({
  custo_material: z.number().min(0),
  custo_mo: z.number().min(0),
  horas_mo: z.number().min(0),
  custo_terceiros: z.number().min(0),
  overhead_pct: z.number().min(0).max(100),
  margem_pct: z.number().min(0).max(100),
  impostos_pct: z.number().min(0).max(100),
  contingencia_pct: z.number().min(0).max(100),
  frete: z.number().min(0),
});

const faturamentoInfoSchema = z.object({
  gatilho: GatilhoFaturamentoEnum,
  percentual_sinal: z.number().min(0).max(100),
  forma_preferida: z.string().min(1, 'Forma de pagamento é obrigatória'),
  instrucoes: z.string().optional().default(''),
});

// ========================================
// SCHEMA PRINCIPAL - CRIAR PROPOSTA
// ========================================

export const createPropostaSchema = z.object({
  cliente: clienteInfoSchema,
  escopo: z.string().min(1, 'Escopo é obrigatório'),

  prazos: prazosInfoSchema,

  permite: StatusPermiteEnum,
  quaisPermites: z.string().optional().default(''),
  normas: z.string().optional().default(''),
  inspecoes: z.string().optional().default(''),

  materiais: z.array(materialSchema).default([]),
  etapas: z.array(etapaSchema).default([]),

  comerciais: comerciaisInfoSchema,
  interno: internoInfoSchema,
  faturamento: faturamentoInfoSchema,

  obsCliente: z.string().optional().default(''),
  obsInternas: z.string().optional().default(''),

  status: StatusPropostaEnum.default('RASCUNHO'),
});

export type CreatePropostaInput = z.infer<typeof createPropostaSchema>;

// ========================================
// SCHEMA - ATUALIZAR PROPOSTA (tudo optional)
// ========================================

export const updatePropostaSchema = createPropostaSchema;

export type UpdatePropostaInput = z.infer<typeof updatePropostaSchema>;
