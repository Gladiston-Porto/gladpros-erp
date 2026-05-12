/**
 * API Response Types
 * 
 * Tipos padronizados para respostas de API
 */

 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  success: false;
   
  error: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
  code?: string;
 
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiValidationError extends ApiError {
  validationErrors: ValidationError[];
}

/**
 * Tipos de erro padronizados
 */
export enum ApiErrorCode {
  // Autenticação/Autorização
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validação
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Recursos
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Negócio
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  EQUIPMENT_IN_USE = 'EQUIPMENT_IN_USE',
  PENDING_RETURNS = 'PENDING_RETURNS',
  EXPIRED_BATCH = 'EXPIRED_BATCH',
  INVALID_STATE = 'INVALID_STATE',
  
  // Sistema
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * HTTP Status Codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;
