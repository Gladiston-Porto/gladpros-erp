jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { headers?: Record<string, string> }) => ({
      url,
      method: 'GET',
      headers: { get: (name: string) => { const h = (init?.headers ?? {}) as Record<string, string>; return h[name] ?? h[name.toLowerCase()] ?? null; } },
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        headers: new Map(),
        json: jest.fn().mockResolvedValue(data),
      })),
    },
  };
});

import { NextRequest } from 'next/server';

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
  can: jest.fn().mockReturnValue(true),
}))

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
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;

function makeRequest(userId = '1') {
  return new NextRequest(`http://localhost/api/usuarios/${userId}/security`);
}

describe('GET /api/usuarios/[id]/security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ nivel: 'USUARIO' });
  });

  it('401 — sem autenticação', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { GET } = await import('@/app/api/usuarios/[id]/security/route');
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('400 — id inválido', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    // NOTE: can() is never called — route returns 400 before the authorization check
    const { GET } = await import('@/app/api/usuarios/[id]/security/route');
    const res = await GET(makeRequest('abc'), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('403 — USUARIO acessando outro usuário', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 99, role: 'USUARIO', email: 'u@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { GET } = await import('@/app/api/usuarios/[id]/security/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('200 — próprio usuário pode ver seus dados de segurança', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'USUARIO', email: 'u@test.com' } as any);
    // can() não é chamado porque id === authUser.id → sem o segundo check
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
      { id: 5, bloqueado: false, bloqueadoEm: null, ultimoLoginEm: new Date('2024-01-15T10:00:00Z') },
    ]);
    const { GET } = await import('@/app/api/usuarios/[id]/security/route');
    const res = await GET(makeRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(5);
    expect(body.data.blocked).toBe(false);
    expect(body.data.lastSuccessfulLoginAt).toBeTruthy();
  });

  it('200 — ADMIN pode ver dados de segurança de outro usuário', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({ nivel: 'USUARIO' });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
      { id: 2, bloqueado: true, bloqueadoEm: new Date('2024-01-10T08:00:00Z'), ultimoLoginEm: null },
    ]);
    const { GET } = await import('@/app/api/usuarios/[id]/security/route');
    const res = await GET(makeRequest('2'), { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.blocked).toBe(true);
    expect(body.data.blockedAt).toBeTruthy();
  });

  it('404 — usuário não encontrado', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({ nivel: 'USUARIO' });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]); // empty result
    const { GET } = await import('@/app/api/usuarios/[id]/security/route');
    const res = await GET(makeRequest('999'), { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('retorna bloqueado=true quando bloqueado=1 (MySQL tinyint)', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({ nivel: 'USUARIO' });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
      { id: 3, bloqueado: 1, bloqueadoEm: new Date(), ultimoLoginEm: null },
    ]);
    const { GET } = await import('@/app/api/usuarios/[id]/security/route');
    const res = await GET(makeRequest('3'), { params: Promise.resolve({ id: '3' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.blocked).toBe(true);
  });
});
