/**
 * Rate Limiter - Correção VUL-001
 * Protege contra brute force e DDoS
 * Usa Redis quando disponível (multi-servidor); fallback em memória para dev/single-server
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

const RATE_LIMITS = {
  // Endpoints de autenticação (mais restritivos)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  // API geral
  api: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    maxRequests: 100,
    message: 'Muitas requisições. Tente novamente em 1 minuto.',
  },
  // Exportações (mais lentas)
  export: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    maxRequests: 5,
    message: 'Muitas exportações. Aguarde 1 minuto.',
  },
};

// ─── Redis client (lazy, compartilhado) ────────────────────────────────────
let redisClient: Redis | null = null;
let redisAvailable = false;

function getRedis(): Redis | null {
  if (redisClient) return redisAvailable ? redisClient : null;

  const url = process.env.REDIS_URL || process.env.REDIS_HOST;
  if (!url) return null;

  try {
    redisClient = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 1000 })
      : new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 1000,
        });

    redisClient.on('connect', () => { redisAvailable = true; });
    redisClient.on('error', () => { redisAvailable = false; });
    redisClient.connect().catch(() => { redisAvailable = false; });
  } catch {
    redisClient = null;
  }
  return redisAvailable ? redisClient : null;
}

// ─── Redis-based rate limit (sliding window via INCR + EXPIRE) ─────────────
async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const redis = getRedis()!;
  const windowSec = Math.ceil(config.windowMs / 1000);
  const resetTime = Date.now() + config.windowMs;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  const ttl = await redis.ttl(key);
  const actualReset = ttl > 0 ? Date.now() + ttl * 1000 : resetTime;

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    reset: actualReset,
  };
}

// ─── Memory-based rate limit (fallback) ────────────────────────────────────
const memoryStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const stored = memoryStore.get(key);

  if (!stored || stored.resetTime <= now) {
    const resetTime = now + config.windowMs;
    memoryStore.set(key, { count: 1, resetTime });
    cleanupMemoryStore();
    return { allowed: true, remaining: config.maxRequests - 1, reset: resetTime };
  }

  stored.count++;
  return {
    allowed: stored.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - stored.count),
    reset: stored.resetTime,
  };
}

function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime <= now) memoryStore.delete(key);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const ip = getClientIp(req);
  const path = req.nextUrl.pathname;
  const key = `rl:${path}:${ip}`;

  const redis = getRedis();
  if (redis) {
    try {
      return await checkRateLimitRedis(key, config);
    } catch {
      // Redis falhou — cair no fallback sem crashar
    }
  }
  return checkRateLimitMemory(key, config);
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;
  return 'unknown';
}

export async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const path = req.nextUrl.pathname;

  let config: RateLimitConfig;
  if (path.startsWith('/api/auth')) {
    config = RATE_LIMITS.auth;
  } else if (path.includes('/export/')) {
    config = RATE_LIMITS.export;
  } else if (path.startsWith('/api/')) {
    config = RATE_LIMITS.api;
  } else {
    return null;
  }

  const result = await checkRateLimit(req, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: config.message || 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.reset));
  return null;
}

// ─── IP Block (Redis-persistent quando disponível) ─────────────────────────
const blockedIps = new Map<string, number>();

export async function blockIp(ip: string, durationMs: number = 3600000): Promise<void> {
  const key = `blocked:${ip}`;
  const redis = getRedis();
  if (redis) {
    await redis.set(key, '1', 'PX', durationMs);
  } else {
    blockedIps.set(key, Date.now() + durationMs);
  }
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const key = `blocked:${ip}`;
  const redis = getRedis();
  if (redis) {
    const val = await redis.get(key);
    return val !== null;
  }
  const blockedUntil = blockedIps.get(key);
  if (!blockedUntil) return false;
  if (blockedUntil <= Date.now()) { blockedIps.delete(key); return false; }
  return true;
}
