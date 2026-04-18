/**
 * Schemas Zod para ProjetoTarefa
 * 
 * Validação de tarefas de projeto com status Kanban
 */

import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const TarefaStatusEnum = z.enum([
  'aberta',
  'em_andamento',
  'bloqueada',
  'concluida',
  'cancelada',
]);

export const TarefaPrioridadeEnum = z.enum([
  'baixa',
  'media',
  'alta',
  'urgente',
]);

// ============================================
// SCHEMAS
// ============================================

export const createTarefaSchema = z.object({
  projetoId: z.number().int().positive('ID do projeto é obrigatório'),
  etapaId: z.number().int().positive().optional(),
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(200),
  descricao: z.string().optional(),
  status: TarefaStatusEnum.default('aberta'),
  atribuidaPara: z.number().int().positive().optional(),
  prazo: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  prioridade: TarefaPrioridadeEnum.default('media'),
  criadoPor: z.number().int().positive('Criador é obrigatório'),
});

export const updateTarefaSchema = createTarefaSchema.partial().extend({
  id: z.number().int().positive('ID da tarefa é obrigatório'),
});

export const updateTarefaStatusSchema = z.object({
  id: z.number().int().positive('ID da tarefa é obrigatório'),
  status: TarefaStatusEnum,
});

export const tarefaFiltersSchema = z.object({
  projetoId: z.number().int().positive('ID do projeto é obrigatório'),
  etapaId: z.number().int().positive().optional(),
  status: TarefaStatusEnum.optional(),
  atribuidaPara: z.number().int().positive().optional(),
  prioridade: TarefaPrioridadeEnum.optional(),
  search: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

export type CreateTarefaInput = z.infer<typeof createTarefaSchema>;
export type UpdateTarefaInput = z.infer<typeof updateTarefaSchema>;
export type UpdateTarefaStatusInput = z.infer<typeof updateTarefaStatusSchema>;
export type TarefaFilters = z.infer<typeof tarefaFiltersSchema>;
export type TarefaStatus = z.infer<typeof TarefaStatusEnum>;
export type TarefaPrioridade = z.infer<typeof TarefaPrioridadeEnum>;
