jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
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
    getUserSessions: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
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

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockGetSessions = SecurityService.getUserSessions as jest.Mock;
const mockRevokeAll = SecurityService.revokeAllUserSessions as jest.Mock;
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock;

function makeRequest(userId = '1', method = 'GET') {
  return new NextRequest(`http://localhost/api/usuarios/${userId}/sessions`, { method });
}

describe('GET /api/usuarios/[id]/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
  });

  it('401 — sem autenticação', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { GET } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('403 — USUARIO acessando sessões de outro usuário', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 99, role: 'USUARIO', email: 'u@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { GET } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('200 — próprio usuário pode ver suas sessões', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'USUARIO', email: 'u@test.com' } as any);
    mockGetSessions.mockResolvedValueOnce([{ id: 1, ip: '127.0.0.1', criadoEm: new Date() }]);
    const { GET } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.sessions).toHaveLength(1);
  });

  it('200 — ADMIN pode ver sessões de outro usuário', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    mockGetSessions.mockResolvedValueOnce([]);
    const { GET } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await GET(makeRequest('2'), { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/usuarios/[id]/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
  });

  it('401 — sem autenticação', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { DELETE } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await DELETE(makeRequest('1', 'DELETE'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('429 — rate limit atingido', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 60000, message: 'Too many requests' });
    const { DELETE } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await DELETE(makeRequest('1', 'DELETE'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too Many Requests');
  });

  it('403 — USUARIO revogando sessões de outro usuário', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    mockRequireUser.mockResolvedValueOnce({ id: 99, role: 'USUARIO', email: 'u@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { DELETE } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await DELETE(makeRequest('5', 'DELETE'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('200 — owner revoga suas próprias sessões', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'USUARIO', email: 'u@test.com' } as any);
    mockRevokeAll.mockResolvedValueOnce(undefined);
    const { DELETE } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await DELETE(makeRequest('5', 'DELETE'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeTruthy();
    expect(mockRevokeAll).toHaveBeenCalledWith(5);
  });

  it('200 — ADMIN revoga sessões de outro usuário', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    mockRevokeAll.mockResolvedValueOnce(undefined);
    const { DELETE } = await import('@/app/api/usuarios/[id]/sessions/route');
    const res = await DELETE(makeRequest('3', 'DELETE'), { params: Promise.resolve({ id: '3' }) });
    expect(res.status).toBe(200);
    expect(mockRevokeAll).toHaveBeenCalledWith(3);
  });
});
