/**
 * API Logger
 *
 * Thin wrapper sobre o logger Pino centralizado (src/shared/lib/logger.ts).
 * Mantém a interface ApiLogger/withLogging para compatibilidade com código existente.
 */

import { NextRequest } from 'next/server';
import pinoLogger from '@/shared/lib/logger';
import { JWTPayload } from './auth';

export interface LogContext {
  method: string;
  url: string;
  userId?: number;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: unknown;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export class ApiLogger {
  private child: ReturnType<typeof pinoLogger.child>;

  constructor(context: string = 'API') {
    this.child = pinoLogger.child({ context });
  }

  info(message: string, ctx?: Partial<LogContext>, data?: unknown) {
    this.child.info({ ...ctx, data }, message);
  }

  warn(message: string, ctx?: Partial<LogContext>, data?: unknown) {
    this.child.warn({ ...ctx, data }, message);
  }

  error(message: string, ctx?: Partial<LogContext>, data?: unknown) {
    this.child.error({ ...ctx, data }, message);
  }

  debug(message: string, ctx?: Partial<LogContext>, data?: unknown) {
    this.child.debug({ ...ctx, data }, message);
  }
}

export const logger = new ApiLogger();

export function createLogContext(
  request: NextRequest,
  user?:
    | JWTPayload
    | {
        id?: number | string | null;
        email?: string | null;
      }
    | null
): LogContext {
  return {
    method: request.method,
    url: request.url,
    userId: typeof user?.id === 'string' ? Number(user.id) : user?.id ?? undefined,
    userEmail: user?.email ?? undefined,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
  };
}

export function withLogging<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();
    const ctx: Partial<LogContext> = { method: request.method, url: request.url };

    logger.info('API Request', ctx);

    try {
      const response = await handler(...args);
      logger.info('API Response', { ...ctx, statusCode: response.status, duration: Date.now() - startTime });
      return response;
    } catch (error) {
      logger.error('API Error', { ...ctx, duration: Date.now() - startTime }, error);
      throw error;
    }
  };
}

// Re-export LogLevel para compatibilidade
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}
