/**
 * Schemas de validação com Zod para o módulo de Projetos
 */

import { z } from 'zod';
import {
  PROJETO_STATUS,
  PROJETO_PRIORIDADE,
  ETAPA_STATUS,
  TAREFA_STATUS,
  TAREFA_PRIORIDADE,
} from './constants';

// Schema de Projeto
export const projetoSchema = z.object({
  propostaId: z.number().int().positive().nullable().optional(),
  clienteId: z.number().int().positive({
    message: 'Cliente é obrigatório',
  }),
  titulo: z.string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  descricao: z.string().max(5000, 'Descrição muito longa').optional(),
  status: z.enum([
    PROJETO_STATUS.PLANEJADO,
    PROJETO_STATUS.EM_EXECUCAO,
    PROJETO_STATUS.EM_INSPECAO,
    PROJETO_STATUS.AGUARDANDO_DEVOLUCOES,
    PROJETO_STATUS.CONCLUIDO,
    PROJETO_STATUS.ARQUIVADO,
    PROJETO_STATUS.SUSPENSO,
    PROJETO_STATUS.CANCELADO,
  ]).default(PROJETO_STATUS.PLANEJADO),
  dataInicioPrevista: z.string().optional(),
  dataInicioReal: z.string().optional(),
  dataConclusaoPrevista: z.string().optional(),
  dataConclusaoReal: z.string().optional(),
  valorEstimado: z.number().nonnegative().optional(),
  custoPrevisto: z.number().nonnegative().optional(),
  custoReal: z.number().nonnegative().optional(),
  margemPrevista: z.number().min(0).max(100).optional(),
  margemReal: z.number().min(0).max(100).optional(),
  lucroPrevisto: z.number().optional(),
  lucroReal: z.number().optional(),
  responsavelId: z.number().int().positive().optional(),
  prioridade: z.enum([
    PROJETO_PRIORIDADE.BAIXA,
    PROJETO_PRIORIDADE.MEDIA,
    PROJETO_PRIORIDADE.ALTA,
    PROJETO_PRIORIDADE.CRITICA,
  ]).default(PROJETO_PRIORIDADE.MEDIA),
  localidade: z.string().max(150).optional(),
  endereco: z.string().max(500).optional(),
}).refine(
  (data) => {
    // Validar que data de início prevista é antes da conclusão prevista
    if (data.dataInicioPrevista && data.dataConclusaoPrevista) {
      return new Date(data.dataInicioPrevista) <= new Date(data.dataConclusaoPrevista);
    }
    return true;
  },
  {
    message: 'Data de início prevista deve ser anterior à data de conclusão prevista',
    path: ['dataConclusaoPrevista'],
  }
).refine(
  (data) => {
    // Validar que custo real não é maior que valor estimado (alerta)
    if (data.valorEstimado && data.custoReal) {
      if (data.custoReal > data.valorEstimado) {
        // Permitir, mas será mostrado como alerta na UI
        return true;
      }
    }
    return true;
  }
);

export type ProjetoFormData = z.infer<typeof projetoSchema>;

// Schema de Etapa
export const etapaSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  descricao: z.string().max(1000).optional(),
  ordem: z.number().int().nonnegative(),
  status: z.enum([
    ETAPA_STATUS.PENDENTE,
    ETAPA_STATUS.EM_ANDAMENTO,
    ETAPA_STATUS.EM_VALIDACAO,
    ETAPA_STATUS.CONCLUIDA,
    ETAPA_STATUS.BLOQUEADA,
    ETAPA_STATUS.CANCELADA,
  ]).default(ETAPA_STATUS.PENDENTE),
  dataInicioPrevista: z.string().optional(),
  dataInicioReal: z.string().optional(),
  dataConclusaoPrevista: z.string().optional(),
  dataConclusaoReal: z.string().optional(),
  percentualConclusao: z.number().min(0).max(100).default(0),
  dependeDe: z.number().int().positive().nullable().optional(),
  responsavelId: z.number().int().positive().optional(),
});

export type EtapaFormData = z.infer<typeof etapaSchema>;

// Schema de Tarefa
export const tarefaSchema = z.object({
  etapaId: z.number().int().positive().nullable().optional(),
  titulo: z.string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  descricao: z.string().max(2000).optional(),
  status: z.enum([
    TAREFA_STATUS.TODO,
    TAREFA_STATUS.IN_PROGRESS,
    TAREFA_STATUS.REVIEW,
    TAREFA_STATUS.DONE,
    TAREFA_STATUS.CANCELLED,
  ]).default(TAREFA_STATUS.TODO),
  prioridade: z.enum([
    TAREFA_PRIORIDADE.BAIXA,
    TAREFA_PRIORIDADE.NORMAL,
    TAREFA_PRIORIDADE.ALTA,
    TAREFA_PRIORIDADE.URGENTE,
  ]).default(TAREFA_PRIORIDADE.NORMAL),
  dataInicio: z.string().optional(),
  dataConclusao: z.string().optional(),
  responsavelId: z.number().int().positive().optional(),
  estimativaHoras: z.number().nonnegative().optional(),
  horasReais: z.number().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
});

export type TarefaFormData = z.infer<typeof tarefaSchema>;

// Schema de Material
export const materialSchema = z.object({
  materialId: z.number().int().positive({
    message: 'Material é obrigatório',
  }),
  quantidade: z.number().positive({
    message: 'Quantidade deve ser maior que zero',
  }),
  unidade: z.string()
    .min(1, 'Unidade é obrigatória')
    .max(20, 'Unidade muito longa'),
  custoUnitario: z.number().nonnegative().optional(),
  observacoes: z.string().max(500).optional(),
});

export type MaterialFormData = z.infer<typeof materialSchema>;

// Schema de Anexo
export const anexoSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome muito longo'),
  tipo: z.string().max(50),
  tamanho: z.number().positive(),
  etapaId: z.number().int().positive().nullable().optional(),
});

export type AnexoFormData = z.infer<typeof anexoSchema>;

// Schema de Filtros
export const filtrosSchema = z.object({
  status: z.string().optional(),
  prioridade: z.string().optional(),
  clienteId: z.string().optional(),
  responsavelId: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z.string().default('criadoEm'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type FiltrosFormData = z.infer<typeof filtrosSchema>;

// Validações auxiliares
export function validateDateRange(startDate: string | undefined, endDate: string | undefined): boolean {
  if (!startDate || !endDate) return true;
  return new Date(startDate) <= new Date(endDate);
}

export function validateBudget(valorEstimado: number | undefined, custoPrevisto: number | undefined): boolean {
  if (!valorEstimado || !custoPrevisto) return true;
  return custoPrevisto <= valorEstimado;
}

export function validateProgress(percentual: number): boolean {
  return percentual >= 0 && percentual <= 100;
}

export function validateFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

// Constantes de validação
export const ALLOWED_FILE_TYPES = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'jpg', 'jpeg', 'png', 'gif',
  'zip', 'rar', '7z',
  'txt', 'csv',
];

export const MAX_FILE_SIZE_MB = 10;

export const MAX_FILES_PER_UPLOAD = 5;
