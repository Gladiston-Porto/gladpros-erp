// src/app/api/monitoring/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/shared/lib/cache';

type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

interface ServiceCheck {
  status: ServiceStatus;
  latencyMs?: number;
  error?: string;
}

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Database unreachable',
    };
  }
}

async function checkCache(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const result = await cacheService.healthCheck();
    if (result.redis) {
      return { status: 'healthy', latencyMs: Date.now() - start };
    }
    // Redis indisponível mas memory cache funciona — degraded, não unhealthy
    return { status: 'degraded', latencyMs: Date.now() - start, error: 'Redis unavailable, using memory cache' };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Cache check failed',
    };
  }
}

async function checkEmail(): Promise<ServiceCheck> {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return { status: 'unhealthy', error: `Missing SMTP config: ${missing.join(', ')}` };
  }
  // Configuração presente — verificação de conexão real exigiria nodemailer.verify()
  // que abre socket, não adequado para um health check de baixa latência.
  return { status: 'healthy' };
}

export async function GET() {
  const [database, cache, email] = await Promise.all([
    checkDatabase(),
    checkCache(),
    checkEmail(),
  ]);

  const services = { database, cache, email };

  const overallStatus: ServiceStatus =
    Object.values(services).some((s) => s.status === 'unhealthy')
      ? 'unhealthy'
      : Object.values(services).some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        usedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        totalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      services,
    },
    { status: httpStatus }
  );
}
