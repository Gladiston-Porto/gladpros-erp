/**
 * API Response Helpers
 * 
 * Funções para criar respostas padronizadas
 */

import { NextResponse } from 'next/server';
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  ApiValidationError,
  ApiErrorCode,
  HttpStatus,
  ValidationError
} from './types';

/**
 * Helper para serializar BigInt como string
 * MaterialMovimentacao.id é BigInt
 */
function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

/**
 * Resposta de sucesso
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = HttpStatus.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data: serializeBigInt(data),
      message
    },
    { status }
  );
}

/**
 * Resposta de sucesso com paginação
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  status: number = HttpStatus.OK
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data: serializeBigInt(data),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    },
    { status }
  );
}

/**
 * Resposta de erro
 */
export function errorResponse(
  error: string,
  code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: any
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      details
    },
    { status }
  );
}

/**
 * Resposta de erro de validação
 */
export function validationErrorResponse(
  validationErrors: ValidationError[],
  message: string = 'Erro de validação'
): NextResponse<ApiValidationError> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ApiErrorCode.VALIDATION_ERROR,
      validationErrors
    },
    { status: HttpStatus.UNPROCESSABLE_ENTITY }
  );
}

/**
 * Resposta de não encontrado
 */
export function notFoundResponse(
  resource: string = 'Recurso'
): NextResponse<ApiError> {
  return errorResponse(
    `${resource} não encontrado`,
    ApiErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND
  );
}

/**
 * Resposta de não autorizado
 */
export function unauthorizedResponse(
  message: string = 'Não autorizado'
): NextResponse<ApiError> {
  return errorResponse(
    message,
    ApiErrorCode.UNAUTHORIZED,
    HttpStatus.UNAUTHORIZED
  );
}

/**
 * Resposta de proibido
 */
export function forbiddenResponse(
  message: string = 'Acesso negado'
): NextResponse<ApiError> {
  return errorResponse(
    message,
    ApiErrorCode.FORBIDDEN,
    HttpStatus.FORBIDDEN
  );
}

/**
 * Resposta de conflito
 */
export function conflictResponse(
  message: string,
  details?: any
): NextResponse<ApiError> {
  return errorResponse(
    message,
    ApiErrorCode.ALREADY_EXISTS,
    HttpStatus.CONFLICT,
    details
  );
}

/**
 * Resposta de erro de negócio
 */
export function businessErrorResponse(
  message: string,
  code: ApiErrorCode,
  details?: any
): NextResponse<ApiError> {
  return errorResponse(
    message,
    code,
    HttpStatus.BAD_REQUEST,
    details
  );
}
