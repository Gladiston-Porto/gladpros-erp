jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try { return new URLSearchParams(url.includes('?') ? url.split('?')[1] ?? '' : ''); }
    catch { return new URLSearchParams(); }
  };
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
      nextUrl: { searchParams: makeSearchParams(url), pathname: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] },
      headers: { get: (name: string) => { const h = (init?.headers ?? {}) as Record<string, string>; return h[name] ?? h[name.toLowerCase()] ?? null; } },
      json: jest.fn().mockImplementation(() => { if (init?.body) { try { return Promise.resolve(JSON.parse(init.body)); } catch { return Promise.resolve({}); } } return Promise.resolve({}); }),
      text: jest.fn().mockResolvedValue(init?.body ?? ''),
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        headers: new Map(),
        cookies: { set: jest.fn(), get: jest.fn(), delete: jest.fn() },
        json: jest.fn().mockResolvedValue(data),
      })),
    },
  };
});

/**
 * Tests: GET + DELETE /api/usuarios/[id]/sessions/route.ts
 *
 * Cobertura:
 *  - Auth (401)
 *  - RBAC: GET requer 'read', DELETE requer 'update' (403)
 *  - ID inválido (400)
 *  - checkUserManagementAccess bloqueando acesso (403)
 *  - GET retorna { data: sessions, success: true }
 *  - DELETE revoga sessões e retorna { data: null, success: true }
 *  - Rate limiting no DELETE (429)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler:
    (fn: (...a: unknown[]) => unknown) =>
    async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        const status = err?.status === 401 ? 401 : 500;
        const { NextResponse } = require('next/server');
        return NextResponse.json(
          { error: err?.message ?? 'Internal Server Error', success: false },
          { status },
        );
      }
    },
}));

jest.mock('@/shared/lib/security', () => ({
  SecurityService: {
    getUserSessions: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  },
}));

// Mock do helper de acesso (mesmo diretório relativo)
jest.mock('@/app/api/usuarios/_helpers/access', () => ({
  checkUserManagementAccess: jest.fn(),
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true }),
  },
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { GET, DELETE } from '../[id]/sessions/route';
import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { SecurityService } from '@/shared/lib/security';
import { checkUserManagementAccess } from '@/app/api/usuarios/_helpers/access';
import { apiRateLimit } from '@/shared/lib/rate-limit';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: 1,
  email: 'admin@gladpros.com',
  role: 'ADMIN',
  nivel: 'ADMIN',
  empresaId: 1,
};

const MOCK_SESSIONS = [
  {
    id: 101,
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    criadoEm: new Date('2025-04-01T10:00:00Z'),
    expiresAt: new Date('2025-04-08T10:00:00Z'),
  },
  {
    id: 102,
    ip: '192.168.1.2',
    userAgent: 'Chrome/120',
    criadoEm: new Date('2025-04-02T08:00:00Z'),
    expiresAt: new Date('2025-04-09T08:00:00Z'),
  },
];

const mockRequest = (method: string, id: string = '42') =>
  new NextRequest(`http://localhost/api/usuarios/${id}/sessions`, { method });

const mockContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

const ACCESS_ALLOWED = { allowed: true, targetRole: 'USUARIO' as const };

const ACCESS_DENIED = {
  allowed: false,
  response: (() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: 'Forbidden', message: 'Você não pode gerenciar este usuário.', success: false },
      { status: 403 },
    );
  })(),
};

// ─── GET /api/usuarios/[id]/sessions ─────────────────────────────────────────

describe('GET /api/usuarios/[id]/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    (checkUserManagementAccess as jest.Mock).mockResolvedValue(ACCESS_ALLOWED);
    (SecurityService.getUserSessions as jest.Mock).mockResolvedValue(MOCK_SESSIONS);
  });

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const res = await GET(mockRequest('GET'), mockContext('42'));

    expect(res.status).toBe(401);
  });

  it('retorna 403 quando can() retorna false para read', async () => {
    (can as jest.Mock).mockReturnValueOnce(false);

    const res = await GET(mockRequest('GET'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(body.success).toBe(false);
  });

  it('retorna 400 para ID inválido (NaN)', async () => {
    const res = await GET(mockRequest('GET', 'xyz'), mockContext('xyz'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toContain('inválido');
    expect(body.success).toBe(false);
  });

  it('retorna 403 quando checkUserManagementAccess nega acesso', async () => {
    (checkUserManagementAccess as jest.Mock).mockResolvedValueOnce(ACCESS_DENIED);

    const res = await GET(mockRequest('GET'), mockContext('42'));

    expect(res.status).toBe(403);
  });

  it('retorna { data: sessions, success: true } no happy path', async () => {
    const res = await GET(mockRequest('GET'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(SecurityService.getUserSessions).toHaveBeenCalledWith(42);
  });

  it('retorna array vazio quando usuário não tem sessões ativas', async () => {
    (SecurityService.getUserSessions as jest.Mock).mockResolvedValueOnce([]);

    const res = await GET(mockRequest('GET'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('usuário pode visualizar as próprias sessões (allowSelf=true)', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({ ...ADMIN_USER, id: 42 });
    (checkUserManagementAccess as jest.Mock).mockResolvedValueOnce(ACCESS_ALLOWED);

    const res = await GET(mockRequest('GET'), mockContext('42'));

    expect(res.status).toBe(200);
    expect(checkUserManagementAccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      42,
      { allowSelf: true },
    );
  });
});

// ─── DELETE /api/usuarios/[id]/sessions ──────────────────────────────────────

describe('DELETE /api/usuarios/[id]/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue(ADMIN_USER);
    (can as jest.Mock).mockReturnValue(true);
    (apiRateLimit.isAllowed as jest.Mock).mockResolvedValue({ allowed: true });
    (checkUserManagementAccess as jest.Mock).mockResolvedValue(ACCESS_ALLOWED);
    (SecurityService.revokeAllUserSessions as jest.Mock).mockResolvedValue(undefined);
  });

  it('retorna 401 quando requireUser lança erro de autenticação', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    (requireUser as jest.Mock).mockRejectedValueOnce(authError);

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));

    expect(res.status).toBe(401);
  });

  it('retorna 403 quando can() retorna false para update', async () => {
    (can as jest.Mock).mockReturnValueOnce(false);

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('retorna 429 quando rate limit está excedido', async () => {
    (apiRateLimit.isAllowed as jest.Mock).mockResolvedValueOnce({
      allowed: false,
      message: 'Muitas requisições. Aguarde.',
      resetTime: Date.now() + 60_000,
    });

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Too Many Requests');
    expect(body.success).toBe(false);
  });

  it('retorna 400 para ID inválido (NaN)', async () => {
    const res = await DELETE(mockRequest('DELETE', 'nope'), mockContext('nope'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain('inválido');
  });

  it('retorna 403 quando checkUserManagementAccess nega acesso', async () => {
    (checkUserManagementAccess as jest.Mock).mockResolvedValueOnce(ACCESS_DENIED);

    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));

    expect(res.status).toBe(403);
  });

  it('revoga sessões e retorna { data: null, success: true }', async () => {
    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
    expect(SecurityService.revokeAllUserSessions).toHaveBeenCalledWith(42);
  });

  it('inclui mensagem de confirmação na resposta do DELETE', async () => {
    const res = await DELETE(mockRequest('DELETE'), mockContext('42'));
    const body = await res.json();

    expect(body.message).toMatch(/revogad/i);
  });

  it('chama checkUserManagementAccess com allowSelf:true', async () => {
    await DELETE(mockRequest('DELETE'), mockContext('42'));

    expect(checkUserManagementAccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      42,
      { allowSelf: true },
    );
  });
});
