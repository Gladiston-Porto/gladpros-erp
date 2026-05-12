/**
 * API Error Handler
 * 
 * Handler centralizado de erros para APIs
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError, ApiErrorCode, ValidationError, HttpStatus } from './types';
import { errorResponse, validationErrorResponse } from './responses';
import { logger } from './logger';

/**
 * Converte ZodError para ValidationError[]
 */
function zodErrorToValidationErrors(error: ZodError): ValidationError[] {
  return error.issues.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

/**
 * Handler de erro do Prisma
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse<ApiError> {
  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    const fields = (error.meta?.target as string[]) || [];
    return errorResponse(
      `Registro duplicado: ${fields.join(', ')} já existe`,
      ApiErrorCode.ALREADY_EXISTS,
      HttpStatus.CONFLICT,
      { fields }
    );
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return errorResponse(
      'Registro não encontrado',
      ApiErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND
    );
  }

  // P2003: Foreign key constraint violation
  if (error.code === 'P2003') {
    const field = error.meta?.field_name as string;
    return errorResponse(
      `Violação de integridade referencial: ${field}`,
      ApiErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      { field }
    );
  }

  // P2014: Relation constraint violation
  if (error.code === 'P2014') {
    return errorResponse(
      'Não é possível excluir: existem registros relacionados',
      ApiErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST
    );
  }

  // Outros erros do Prisma
  return errorResponse(
    'Erro no banco de dados',
    ApiErrorCode.DATABASE_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR,
    { code: error.code, meta: error.meta }
  );
}

/**
 * Handler principal de erros
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('❌ API Error:', error);

  // Erro de validação Zod
  if (error instanceof ZodError) {
    return validationErrorResponse(
      zodErrorToValidationErrors(error),
      'Dados inválidos'
    );
  }

  // Erro do Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  // Erro de validação do Prisma
  if (error instanceof Prisma.PrismaClientValidationError) {
    return errorResponse(
      `Erro de validação nos dados: ${error.message}`,
      ApiErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST
    );
  }

  // Erro genérico
  if (error instanceof Error) {
    // Auth errors de requireUser/requireRoles
    if (error.message === 'UNAUTHENTICATED') {
      return errorResponse(
        'Autenticação necessária',
        ApiErrorCode.UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED
      );
    }
    if (error.message === 'FORBIDDEN') {
      return errorResponse(
        'Acesso negado',
        ApiErrorCode.FORBIDDEN,
        HttpStatus.FORBIDDEN
      );
    }

    // Não expor detalhes técnicos em produção
    const isDev = process.env.NODE_ENV === 'development';

    return errorResponse(
      isDev ? error.message : 'Erro interno do servidor',
      ApiErrorCode.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      isDev ? { stack: error.stack } : undefined
    );
  }

  // Erro desconhecido
  return errorResponse(
    'Erro desconhecido',
    ApiErrorCode.INTERNAL_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}

/**
 * Wrapper para route handlers com tratamento de erro
 */
 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const isExpectedError =
        error instanceof ZodError ||
        (typeof error === 'object' && error !== null && 'statusCode' in error) ||
        (error instanceof Error && (error.message === 'UNAUTHENTICATED' || error.message === 'FORBIDDEN'));
      if (!isExpectedError) {
        logger.error('[API] Erro não tratado no handler', {}, error as Error);
      }
      return handleApiError(error);
    }
  };
}
