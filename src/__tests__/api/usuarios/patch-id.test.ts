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

jest.mock('@/shared/lib/usuario-query', () => ({
  buildUsuarioSelect: jest.fn().mockResolvedValue('id,email,nomeCompleto,nivel,status'),
  getUsuarioColumns: jest
    .fn()
    .mockResolvedValue(
      new Set([
        'email',
        'nomeCompleto',
        'telefone',
        'dataNascimento',
        'nivel',
        'status',
        'avatarUrl',
        'anotacoes',
      ]),
    ),
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
  userUpdateApiSchema: {
    safeParse: jest.fn().mockImplementation((data: unknown) => ({ success: true, data })),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
}));

import { requireUser } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function makePatchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('PATCH /api/usuarios/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 — no auth', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { PATCH } = await import('@/app/api/usuarios/[id]/route');
    const res = await PATCH(makePatchRequest('5', { nomeCompleto: 'New Name' }), {
      params: Promise.resolve({ id: '5' }),
    });
    expect(res.status).toBe(401);
  });

  it('403 — trying to edit another user without permission', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 10,
      role: 'USUARIO',
      email: 'u@test.com',
      empresaId: 1,
    } as any);
    const { PATCH } = await import('@/app/api/usuarios/[id]/route');
    const res = await PATCH(makePatchRequest('5', { nomeCompleto: 'New Name' }), {
      params: Promise.resolve({ id: '5' }),
    });
    expect(res.status).toBe(403);
  });

  it('404 — user not found', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]); // getTargetUserRole returns null
    const { PATCH } = await import('@/app/api/usuarios/[id]/route');
    const res = await PATCH(makePatchRequest('999', { nomeCompleto: 'New Name' }), {
      params: Promise.resolve({ id: '999' }),
    });
    expect(res.status).toBe(404);
  });

  it('400 — invalid body (Zod validation)', async () => {
    const { userUpdateApiSchema } = require('@/shared/lib/validation');
    (userUpdateApiSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: { issues: [{ path: ['email'], message: 'Invalid email' }] },
    });
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ nivel: 'USUARIO' }]);
    const { PATCH } = await import('@/app/api/usuarios/[id]/route');
    const res = await PATCH(makePatchRequest('5', { email: 'bad' }), {
      params: Promise.resolve({ id: '5' }),
    });
    expect(res.status).toBe(400);
  });

  it('400 — trying to demote last ADMIN', async () => {
    // authUser.id=1 targeting user id=2 (another admin) — not self-edit, so role field is not stripped
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ nivel: 'ADMIN' }]) // getTargetUserRole for id=2
      .mockResolvedValueOnce([{ cnt: BigInt(0) }]); // countActiveAdmins (excluding id=2) = 0
    const { PATCH } = await import('@/app/api/usuarios/[id]/route');
    const res = await PATCH(makePatchRequest('2', { role: 'GERENTE' }), {
      params: Promise.resolve({ id: '2' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('LAST_ADMIN');
  });

  it('200 — happy path returns { data: { id }, success: true }', async () => {
    mockRequireUser.mockResolvedValueOnce({
      id: 1,
      role: 'ADMIN',
      email: 'a@test.com',
      empresaId: 1,
    } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ nivel: 'USUARIO' }]); // getTargetUserRole
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([{ id: 5, nomeCompleto: 'Old Name', nivel: 'USUARIO' }]) // before
      .mockResolvedValueOnce([{ id: 5, nomeCompleto: 'New Name', nivel: 'USUARIO' }]); // after
    (prisma.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(1);
    const { PATCH } = await import('@/app/api/usuarios/[id]/route');
    const res = await PATCH(makePatchRequest('5', { nomeCompleto: 'New Name' }), {
      params: Promise.resolve({ id: '5' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(5);
  });
});
