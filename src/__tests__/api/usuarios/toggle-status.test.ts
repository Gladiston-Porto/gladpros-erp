jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try {
      return new URLSearchParams(url.includes('?') ? (url.split('?')[1] ?? '') : '');
    } catch {
      return new URLSearchParams();
    }
  };
  return {
    NextRequest: jest
      .fn()
      .mockImplementation(
        (
          url: string,
          init?: { method?: string; body?: string; headers?: Record<string, string> },
        ) => ({
          url,
          method: (init?.method ?? 'GET').toUpperCase(),
          nextUrl: {
            searchParams: makeSearchParams(url),
            pathname: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0],
          },
          headers: {
            get: (name: string) => {
              const h = (init?.headers ?? {}) as Record<string, string>;
              return h[name] ?? h[name.toLowerCase()] ?? null;
            },
          },
          json: jest.fn().mockImplementation(() => {
            if (init?.body) {
              try {
                return Promise.resolve(JSON.parse(init.body));
              } catch {
                return Promise.resolve({});
              }
            }
            return Promise.resolve({});
          }),
          text: jest.fn().mockResolvedValue(init?.body ?? ''),
        }),
      ),
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
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
  UserRole: {
    ADMIN: 'ADMIN',
    GERENTE: 'GERENTE',
    FINANCEIRO: 'FINANCEIRO',
    USUARIO: 'USUARIO',
    ESTOQUE: 'ESTOQUE',
    CLIENTE: 'CLIENTE',
  },
  canManageRole: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest
    .fn()
    .mockImplementation((handler: Function) => async (...args: unknown[]) => {
      try {
        return await handler(...args);
      } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
          return {
            status: 401,
            headers: new Map(),
            json: jest.fn().mockResolvedValue({ error: 'Unauthorized', success: false }),
          };
        }
        if (error instanceof Error && error.message === 'FORBIDDEN') {
          return {
            status: 403,
            headers: new Map(),
            json: jest.fn().mockResolvedValue({ error: 'Forbidden', success: false }),
          };
        }
        return {
          status: 500,
          headers: new Map(),
          json: jest.fn().mockResolvedValue({ error: 'Internal server error', success: false }),
        };
      }
    }),
}));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makePutRequest(id: string) {
  return new NextRequest(`http://localhost/api/usuarios/${id}/toggle-status`, { method: 'PUT' });
}

describe('PUT /api/usuarios/:id/toggle-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    const res = await PUT(makePutRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(401);
  });

  it('403 — USUARIO role denied', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'USUARIO',
      email: 'u@test.com',
      empresaId: 1,
    } as any);
    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    const res = await PUT(makePutRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('400 — trying to toggle self', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 5,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      status: 'ATIVO',
      email: 'a@test.com',
      nivel: 'ADMIN',
    });
    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    const res = await PUT(makePutRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
  });

  it('404 — user not found', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce(null);
    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    const res = await PUT(makePutRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(404);
  });

  it('200 — happy path toggles status', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      status: 'ATIVO',
      email: 'user@test.com',
      nivel: 'USUARIO',
    });
    (prisma.usuario.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    const res = await PUT(makePutRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('INATIVO');
  });

  it('desativar — incrementa tokenVersion para invalidar sessões existentes', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      status: 'ATIVO',
      email: 'user@test.com',
      nivel: 'USUARIO',
    });
    (prisma.usuario.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: 0 }]); // não é ADMIN
    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    await PUT(makePutRequest('5'), { params: Promise.resolve({ id: '5' }) });
    const updateCall = (prisma.usuario.updateMany as jest.Mock).mock.calls[0][0];
    // tokenVersion deve ser incrementado ao desativar
    expect(updateCall.data).toMatchObject({ status: 'INATIVO', tokenVersion: { increment: 1 } });
  });

  it('reativar — NÃO incrementa tokenVersion (não invalida sessões)', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      status: 'INATIVO',
      email: 'user@test.com',
      nivel: 'USUARIO',
    });
    (prisma.usuario.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    await PUT(makePutRequest('5'), { params: Promise.resolve({ id: '5' }) });
    const updateCall = (prisma.usuario.updateMany as jest.Mock).mock.calls[0][0];
    // ao reativar, tokenVersion NÃO deve estar presente
    expect(updateCall.data.tokenVersion).toBeUndefined();
  });
});
