/**
 * parseApiError
 *
 * Converte respostas de erro padronizadas (formato { error, message, validationErrors })
 * em um formato consumível por formulários: erros por campo + mensagem principal.
 *
 * Usado por formulários de criação/edição para exibir validações inline em vez de
 * apenas um toast genérico. Pareado com `validationErrorResponse` em src/lib/api/responses.ts
 * e o `handleApiError` em src/lib/api/error-handler.ts.
 */

export interface ParsedApiError {
  fieldErrors: Record<string, string>;
  firstMessage: string;
}

export function parseApiError(data: unknown, fallback = 'Erro ao processar requisição'): ParsedApiError {
  const fieldErrors: Record<string, string> = {};

  if (!data || typeof data !== 'object') {
    return { fieldErrors, firstMessage: fallback };
  }

  const obj = data as Record<string, unknown>;
  const validationErrors = obj.validationErrors;

  if (Array.isArray(validationErrors)) {
    for (const item of validationErrors) {
      if (item && typeof item === 'object') {
        const field = (item as { field?: unknown }).field;
        const message = (item as { message?: unknown }).message;
        if (typeof field === 'string' && field.length > 0 && typeof message === 'string') {
          if (!fieldErrors[field]) fieldErrors[field] = message;
        }
      }
    }
  }

  const firstFieldMsg = Object.values(fieldErrors)[0];
  const errorMsg = typeof obj.error === 'string' ? obj.error : undefined;
  const messageMsg = typeof obj.message === 'string' ? obj.message : undefined;

  return {
    fieldErrors,
    firstMessage: firstFieldMsg || messageMsg || errorMsg || fallback,
  };
}
