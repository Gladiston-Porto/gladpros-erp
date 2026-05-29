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

jest.mock('@/shared/lib/usuario-query', () => ({
  buildUsuarioSelect: jest.fn().mockResolvedValue('id,email,nomeCompleto,nivel,status'),
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

jest.mock('@/shared/lib/validation', () => ({
  userUpdateApiSchema: { safeParse: jest.fn() },
}));

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hash') }));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/usuarios/${id}`, { method: 'DELETE' });
}

describe('DELETE /api/usuarios/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(401);
  });

  it('403 — no delete permission', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'USUARIO',
      email: 'u@test.com',
      empresaId: 1,
    } as any);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('400 — trying to delete self', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 5,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
  });

  it('404 — not found', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce(null);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('999'), { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('400 — deleting last ADMIN', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 2,
      email: 'admin2@test.com',
      status: 'ATIVO',
      nivel: 'ADMIN',
    });
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ cnt: BigInt(0) }]);
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('2'), { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('LAST_ADMIN');
  });

  it('200 — happy path soft deletes user (status → INATIVO)', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      email: 'user@test.com',
      status: 'ATIVO',
      nivel: 'USUARIO',
    });
    (prisma.usuario.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    const res = await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5, empresaId: 1 },
        data: expect.objectContaining({ status: 'INATIVO' }),
      }),
    );
  });

  // @bug:USUARIOS-P2-003 — regressão: DELETE deve incrementar tokenVersion para invalidar JWTs
  it('DELETE deve incrementar tokenVersion ao desativar usuário', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 5,
      email: 'user@test.com',
      status: 'ATIVO',
      nivel: 'USUARIO',
    });
    (prisma.usuario.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    const { DELETE } = await import('@/app/api/usuarios/[id]/route');
    await DELETE(makeDeleteRequest('5'), { params: Promise.resolve({ id: '5' }) });
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5, empresaId: 1 },
        data: expect.objectContaining({
          status: 'INATIVO',
          tokenVersion: { increment: 1 },
        }),
      }),
    );
  });
});
