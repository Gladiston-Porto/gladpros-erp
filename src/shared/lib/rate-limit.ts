import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// Redis client para rate limiting
let redis: Redis | null = null;

function shouldUseRedis() {
  if (process.env.REDIS_DISABLED === 'true') {
    return false;
  }

  if (process.env.REDIS_ENABLED === 'true') {
    return true;
  }

  // Requer configuração explícita em qualquer ambiente.
  // Sem REDIS_URL nem REDIS_HOST, não tenta conectar — evita timeout de 1s
  // no primeiro request após reinício do servidor quando Redis não está disponível.
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}

function disableRedis() {
  if (redis) {
    try {
      redis.disconnect();
    } catch {
      // noop
    }
  }
  redis = null;
}

if (shouldUseRedis()) {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: true,
      connectTimeout: 1000,
      maxRetriesPerRequest: 1
    });
    
    // Silenciar erros de conexão Redis quando não está disponível
    redis.on('error', () => {
      const g = global as unknown as { __redis_error_logged?: boolean };
      if (!g.__redis_error_logged) {
        console.warn('[RATE LIMIT] Redis não disponível, usando rate limit em memória');
        g.__redis_error_logged = true;
      }
    });
  } catch {
    console.warn('[RATE LIMIT] Redis não disponível, usando rate limit em memória');
    redis = null;
  }
}

// Cache em memória como fallback
const memoryCache = new Map<string, { count: number; resetTime: number }>();

/** Limpa entradas do cache em memória que correspondam ao padrão (ou todas, se omitido). Uso exclusivo em testes. */
export function clearRateLimitsByPattern(pattern?: string | RegExp): void {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) memoryCache.delete(key);
  }
}

interface RateLimitOptions {
  windowMs: number;  // Janela de tempo em ms
  max: number;       // Máximo de requests
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req) => this.getClientIP(req),
      skipSuccessfulRequests: false,
      message: 'Muitas tentativas. Tente novamente mais tarde.',
      ...options
    };
  }

  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const real = req.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return real || 'unknown';
  }

  async isAllowed(req: NextRequest, customKey?: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    message?: string;
  }> {
    const key = customKey || this.options.keyGenerator!(req);
  const now = Date.now();

    try {
      if (redis) {
        const windowStart = now - this.options.windowMs;
        return await this.checkRedisLimit(key, now, windowStart);
      } else {
        return this.checkMemoryLimit(key, now);
      }
    } catch (e) {
      if (redis) {
        console.warn('[RATE LIMIT] Falha no Redis, usando rate limit em memória');
        disableRedis();
        return this.checkMemoryLimit(key, now);
      }
      console.error('[RATE LIMIT] Erro:', e);
      return this.checkMemoryLimit(key, now);
    }
  }

  private async checkRedisLimit(key: string, now: number, windowStart: number) {
    const redisKey = `rate_limit:${key}`;
    
    // Usar pipeline para operações atômicas
    const pipeline = redis!.pipeline();
    
    // Remover entradas antigas
    pipeline.zremrangebyscore(redisKey, '-inf', windowStart);
    
    // Contar requests na janela atual
    pipeline.zcard(redisKey);
    
    // Adicionar request atual
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    
    // Definir expiração
    pipeline.expire(redisKey, Math.ceil(this.options.windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const currentCount = (results[1][1] as number) || 0;
    const allowed = currentCount < this.options.max;
    const remaining = Math.max(0, this.options.max - currentCount - 1);
    const resetTime = now + this.options.windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      message: allowed ? undefined : this.options.message
    };
  }

  private checkMemoryLimit(key: string, now: number) {
    const entry = memoryCache.get(key);
    
    // Limpar entrada expirada
    if (entry && entry.resetTime <= now) {
      memoryCache.delete(key);
    }

    const currentEntry = memoryCache.get(key) || { count: 0, resetTime: now + this.options.windowMs };
    
    const allowed = currentEntry.count < this.options.max;
    
    if (allowed) {
      currentEntry.count++;
      memoryCache.set(key, currentEntry);
    }

    const remaining = Math.max(0, this.options.max - currentEntry.count);

    return {
      allowed,
      remaining,
      resetTime: currentEntry.resetTime,
      message: allowed ? undefined : this.options.message
    };
  }

  // Middleware wrapper
  middleware() {
    return async (req: NextRequest) => {
      const result = await this.isAllowed(req);
      
      if (!result.allowed) {
        return NextResponse.json(
          { error: result.message, retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000) },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': this.options.max.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
            }
          }
        );
      }

      // Adicionar headers informativos
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', this.options.max.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

      return response;
    };
  }

  // Helper para usar com chave customizada
  async checkLimit(req: NextRequest, customKey?: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    message?: string;
  }> {
    return this.isAllowed(req, customKey);
  }
}

// Rate limiters pré-configurados
export const loginRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});

export const mfaRateLimit = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // 3 tentativas
  keyGenerator: (req) => {
    // Usar email do body se disponível, senão IP
    try {
      const body = req.body as unknown;
      const email = (body && typeof body === 'object' && 'email' in (body as Record<string, unknown>)
        ? (body as Record<string, unknown>).email
        : undefined) as string | undefined;
      return email 
        ? `mfa:${email}` 
        : `mfa:ip:${req.headers.get('x-forwarded-for') || 'unknown'}`;
    } catch {
      return `mfa:ip:${req.headers.get('x-forwarded-for') || 'unknown'}`;
    }
  },
  message: 'Muitas tentativas de MFA. Aguarde 5 minutos.'
});

export const resetPasswordRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 solicitações por email
  message: 'Muitas solicitações de reset. Tente novamente em 1 hora.'
});

export const apiRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: 'Muitas requisições à API. Aguarde um momento.'
});

export const exportRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // exportações financeiras são mais sensíveis e custosas
  message: 'Muitas exportações. Aguarde 1 minuto.'
});
