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

jest.mock('@/shared/lib/cache/business-cache', () => ({
  withBusinessCache: jest.fn().mockImplementation((_key: string, fn: () => unknown) => fn()),
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

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makeRequest(url = 'http://localhost/api/usuarios') {
  return new NextRequest(url);
}

describe('GET /api/usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('403 — role without read permission', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'CLIENTE', email: 'c@test.com' } as any);
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('200 — happy path returns items and total', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com', empresaId: 1 } as any);
    // Promise.all: [items, count, stats]
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      { id: 1, email: 'user1@test.com', nomeCompleto: 'User One', nivel: 'USUARIO', status: 'ATIVO' },
      { id: 2, email: 'user2@test.com', nomeCompleto: 'User Two', nivel: 'GERENTE', status: 'ATIVO' },
    ]);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ cnt: BigInt(2) }]);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ status: 'ATIVO', cnt: BigInt(2) }]);
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest('http://localhost/api/usuarios?page=1&pageSize=10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination.total).toBe(2);
    expect(body.success).toBe(true);
  });

  it('200 — pagination params respected', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com', empresaId: 1 } as any);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]); // items
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ cnt: BigInt(50) }]); // count
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]); // stats
    const { GET } = await import('@/app/api/usuarios/route');
    const res = await GET(makeRequest('http://localhost/api/usuarios?page=3&pageSize=5'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.pageSize).toBe(5);
    expect(body.pagination.total).toBe(50);
  });
});
