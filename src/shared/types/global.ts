// src/types/global.ts - Tipos globais para substituir 'any'

// Tipos utilitários para dados genéricos
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

// Tipo para dados de formulário
export type FormDataValue = string | number | boolean | File | null;
export type FormDataObject = Record<string, FormDataValue>;

// Tipo para respostas de API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

// Tipo para erros de API
export interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// Tipo para dados de paginação
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipo para filtros de busca
export type SearchFilters = Record<string, string | number | boolean | string[]>;

// Tipo para dados de auditoria
export interface AuditData {
  userId: string | number;
  action: string;
  entity: string;
  entityId: string | number;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Tipo para configurações de cache
export interface CacheConfig {
  ttl: number;
  key: string;
  tags?: string[];
}

// Tipo para dados de sessão
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  expiresAt: Date;
}

// Tipo para dados de upload de arquivo
export interface FileUploadData {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  encoding?: string;
}

// Tipo para dados de email
export interface EmailData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    encoding?: string;
  }>;
}

// Função utilitária para type assertion segura
export function assertType<T>(value: unknown, validator: (val: unknown) => val is T): T {
  if (!validator(value)) {
    throw new Error('Type assertion failed');
  }
  return value;
}

// Função para verificar se um valor é de um tipo específico
export function isOfType<T>(value: unknown, validator: (val: unknown) => val is T): value is T {
  return validator(value);
}

// Validators comuns
export const validators = {
  isString: (value: unknown): value is string => typeof value === 'string',
  isNumber: (value: unknown): value is number => typeof value === 'number' && !isNaN(value),
  isBoolean: (value: unknown): value is boolean => typeof value === 'boolean',
  isObject: (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value),
  isArray: (value: unknown): value is unknown[] => Array.isArray(value),
  isEmail: (value: unknown): value is string =>
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
} as const;
