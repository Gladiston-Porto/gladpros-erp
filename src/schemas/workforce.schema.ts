/**
 * Schemas de Validação - Módulo Workforce
 *
 * Validações Zod para workers e timesheets.
 */

import { z } from 'zod';

// ========================================
// ENUMS
// ========================================

export const WorkerTypeEnum = z.enum(['INDIVIDUAL', 'COMPANY']);

export const WorkerStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

export const PaymentMethodEnum = z.enum(['CHECK', 'ZELLE', 'ACH', 'CASH', 'WIRE', 'OTHER']);

export const TimesheetEntryStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);

// ========================================
// WORKER - FINANCIAL PROFILE SUB-SCHEMA
// ========================================

const financialProfileSchema = z.object({
  paymentMethod: PaymentMethodEnum.optional().default('CHECK'),
  payeeName: z.string().optional(),
  accountLast4: z.string().max(4).optional(),
  taxIdLast4: z.string().max(4).optional(),
});

// ========================================
// SCHEMA - CRIAR/ATUALIZAR WORKER
// ========================================

export const createWorkerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().email('Email inválido').optional().nullable(),
  ),
  phone: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  type: WorkerTypeEnum.optional().default('INDIVIDUAL'),
  companyName: z.string().optional().nullable(),
  ein: z.string().optional().nullable(),
  status: WorkerStatusEnum.optional().default('ACTIVE'),
  defaultHourlyRate: z.coerce.number().min(0, 'Taxa horária deve ser >= 0').optional().nullable(),
  usuarioId: z.number().int().positive().optional().nullable(),
  financialProfile: financialProfileSchema.optional(),
}).refine(
  (data) => {
    // INDIVIDUAL requer email
    if (data.type === 'INDIVIDUAL') {
      return data.email != null && data.email.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Email é obrigatório para workers do tipo INDIVIDUAL',
    path: ['email'],
  }
);

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;

// ========================================
// TIMESHEET ENTRY SUB-SCHEMA
// ========================================

const timesheetEntrySchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  hours: z.number().min(0, 'Horas devem ser >= 0').max(24, 'Máximo 24 horas por dia'),
  jobId: z.number().int().positive().optional().nullable(),
  projectId: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
});

// ========================================
// SCHEMA - CRIAR TIMESHEET
// ========================================

export const createTimesheetSchema = z.object({
  assignmentId: z.number().int().positive('assignmentId deve ser positivo'),
  periodStart: z.string().min(1, 'periodStart é obrigatório'),
  periodEnd: z.string().min(1, 'periodEnd é obrigatório'),
  entries: z.array(timesheetEntrySchema).optional(),
}).refine(
  (data) => {
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
  },
  {
    message: 'periodEnd deve ser igual ou posterior a periodStart',
    path: ['periodEnd'],
  }
);

export type CreateTimesheetInput = z.infer<typeof createTimesheetSchema>;
