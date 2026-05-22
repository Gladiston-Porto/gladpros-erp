jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'DELETE').toUpperCase(),
      headers: { get: (name: string) => { const h = (init?.headers ?? {}) as Record<string, string>; return h[name] ?? h[name.toLowerCase()] ?? null; } },
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number; headers?: Record<string, string> }) => ({
        status: options?.status ?? 200,
        headers: new Map(Object.entries(options?.headers ?? {})),
        json: jest.fn().mockResolvedValue(data),
      })),
    },
  };
});

import { NextRequest } from 'next/server';

jest.mock('@/shared/lib/security', () => ({
  SecurityService: {
    revokeSession: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn().mockReturnValue(true),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' }),
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
        return { status: 401, headers: new Map(), json: jest.fn().mockResolvedValue({ error: 'Unauthorized', success: false }) };
      }
      return { status: 500, headers: new Map(), json: jest.fn().mockResolvedValue({ error: 'Internal server error', success: false }) };
    }
  }),
}));

import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { SecurityService } from '@/shared/lib/security';
import { apiRateLimit } from '@/shared/lib/rate-limit';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockRevokeSession = SecurityService.revokeSession as jest.Mock;
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock;

function makeRequest(sessionId = '10') {
  return new NextRequest(`http://localhost/api/usuarios/sessions/${sessionId}`, { method: 'DELETE' });
}

describe('DELETE /api/usuarios/sessions/[sessionId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ usuarioId: 99, nivel: 'ADMIN' }]);
  });

  it('429 — rate limit atingido', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 60000, message: 'Too many requests' });
    const { DELETE } = await import('@/app/api/usuarios/sessions/[sessionId]/route');
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ sessionId: '10' }) });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too Many Requests');
    expect(body.success).toBe(false);
  });

  it('401 — sem autenticação (após rate limit)', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { DELETE } = await import('@/app/api/usuarios/sessions/[sessionId]/route');
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ sessionId: '10' }) });
    expect(res.status).toBe(401);
  });

  it('403 — USUARIO sem permissão de update em usuarios', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'USUARIO', email: 'u@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { DELETE } = await import('@/app/api/usuarios/sessions/[sessionId]/route');
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ sessionId: '10' }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('403 — CLIENTE sem permissão', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 6, role: 'CLIENTE', email: 'c@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { DELETE } = await import('@/app/api/usuarios/sessions/[sessionId]/route');
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ sessionId: '10' }) });
    expect(res.status).toBe(403);
  });

  it('400 — sessionId inválido (NaN)', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    const { DELETE } = await import('@/app/api/usuarios/sessions/[sessionId]/route');
    const res = await DELETE(makeRequest('abc'), { params: Promise.resolve({ sessionId: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('200 — ADMIN revoga sessão com sucesso', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ usuarioId: 5, nivel: 'USUARIO' }]);
    mockRevokeSession.mockResolvedValueOnce(undefined);
    const { DELETE } = await import('@/app/api/usuarios/sessions/[sessionId]/route');
    const res = await DELETE(makeRequest('10'), { params: Promise.resolve({ sessionId: '10' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeTruthy();
    expect(mockRevokeSession).toHaveBeenCalledWith(10);
  });

  it('200 — GERENTE revoga sessão com sucesso', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    mockRequireUser.mockResolvedValueOnce({ id: 2, role: 'GERENTE', email: 'g@test.com' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ usuarioId: 5, nivel: 'USUARIO' }]);
    mockRevokeSession.mockResolvedValueOnce(undefined);
    const { DELETE } = await import('@/app/api/usuarios/sessions/[sessionId]/route');
    const res = await DELETE(makeRequest('15'), { params: Promise.resolve({ sessionId: '15' }) });
    expect(res.status).toBe(200);
    expect(mockRevokeSession).toHaveBeenCalledWith(15);
  });
});
