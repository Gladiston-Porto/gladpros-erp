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

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditoriaService: {
    registrarCriacaoUsuario: jest.fn(),
    registrarAtualizacaoUsuario: jest.fn(),
    registrarExclusaoUsuario: jest.fn(),
  },
}));

jest.mock('@/shared/lib/user-hierarchy', () => ({
  UserRole: { ADMIN: 'ADMIN', GERENTE: 'GERENTE', FINANCEIRO: 'FINANCEIRO', USUARIO: 'USUARIO', ESTOQUE: 'ESTOQUE', CLIENTE: 'CLIENTE' },
  canManageRole: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
        return { status: 401, headers: new Map(), json: jest.fn().mockResolvedValue({ error: 'Unauthorized', success: false }) };
      }
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return { status: 403, headers: new Map(), json: jest.fn().mockResolvedValue({ error: 'Forbidden', success: false }) };
      }
      return { status: 500, headers: new Map(), json: jest.fn().mockResolvedValue({ error: 'Internal server error', success: false }) };
    }
  }),
}));

jest.mock('@/shared/lib/validation', () => ({
  toggleUserStatusSchema: {
    safeParse: jest.fn().mockImplementation((data: unknown) => ({ success: true, data })),
  },
}));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makePatchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/usuarios/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('PATCH /api/usuarios/:id/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', { ativo: false }), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(401);
  });

  it('403 — USUARIO role denied', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'USUARIO', email: 'u@test.com' } as any);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', { ativo: false }), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('400 — invalid body', async () => {
    const { toggleUserStatusSchema } = require('@/shared/lib/validation');
    (toggleUserStatusSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: { issues: [{ message: 'ativo is required' }] },
    });
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', {}), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
  });

  it('200 — happy path returns { data: { ativo }, success: true }', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    // Impedir self-toggle: authUser.id=1, userId=5 → OK
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO' }]);
    (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const res = await PATCH(makePatchRequest('5', { ativo: false }), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('ativo');
  });

  // BUG-01 regression: deactivating must increment tokenVersion to invalidate JWTs
  it('BUG-01 regression — deactivating user includes tokenVersion increment in SQL', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO' }]);
    (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    await PATCH(makePatchRequest('5', { ativo: false }), { params: Promise.resolve({ id: '5' }) });
    const executeRawMock = prisma.$executeRaw as jest.Mock;
    const callArgs = executeRawMock.mock.calls[0];
    // Tagged template literal: first arg is TemplateStringsArray; check strings contain tokenVersion
    const sqlParts = callArgs[0] as TemplateStringsArray;
    const fullSql = sqlParts.join(' ');
    expect(fullSql).toContain('tokenVersion');
  });

  // BUG-01 regression: activating must NOT touch tokenVersion
  it('BUG-01 regression — activating user does NOT touch tokenVersion', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'INATIVO' }]);
    (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1);
    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    await PATCH(makePatchRequest('5', { ativo: true }), { params: Promise.resolve({ id: '5' }) });
    const executeRawMock = prisma.$executeRaw as jest.Mock;
    const callArgs = executeRawMock.mock.calls[0];
    const sqlParts = callArgs[0] as TemplateStringsArray;
    const fullSql = sqlParts.join(' ');
    expect(fullSql).not.toContain('tokenVersion');
  });
});
