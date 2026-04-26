jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
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
  return new NextRequest(`http://localhost/api/usuarios/${userId}/auditoria`);
}

describe('GET /api/usuarios/[id]/auditoria', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — sem autenticação', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { GET } = await import('@/app/api/usuarios/[id]/auditoria/route');
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('403 — role sem permissão (USUARIO)', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 99, role: 'USUARIO', email: 'u@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { GET } = await import('@/app/api/usuarios/[id]/auditoria/route');
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('403 — role sem permissão (CLIENTE)', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 99, role: 'CLIENTE', email: 'c@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { GET } = await import('@/app/api/usuarios/[id]/auditoria/route');
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(403);
  });

  it('400 — id inválido (NaN)', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    const { GET } = await import('@/app/api/usuarios/[id]/auditoria/route');
    const res = await GET(makeRequest('abc'), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('200 — ADMIN retorna logs de auditoria', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    const fakeAuditorias = [
      { id: 1, tabela: 'Usuario', registroId: 1, acao: 'UPDATE', usuarioId: 1, ip: '127.0.0.1', payload: null, criadoEm: new Date(), nomeCompleto: 'Admin', email: 'a@test.com' },
    ];
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(fakeAuditorias);
    const { GET } = await import('@/app/api/usuarios/[id]/auditoria/route');
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('200 — GERENTE pode acessar auditoria', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 2, role: 'GERENTE', email: 'g@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
    const { GET } = await import('@/app/api/usuarios/[id]/auditoria/route');
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });
});
