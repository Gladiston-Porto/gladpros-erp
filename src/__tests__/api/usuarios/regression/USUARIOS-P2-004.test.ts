// @bug:USUARIOS-P2-004
// @description: delegacoes/[id] deve exigir can() para leitura e cancelamento.

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string }) => ({
    url,
    method: (init?.method ?? 'GET').toUpperCase(),
    headers: { get: jest.fn().mockReturnValue(null) },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
      status: options?.status ?? 200,
      headers: new Map(),
      json: jest.fn().mockResolvedValue(data),
    })),
  },
}));

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    delegacao: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/shared/lib/user-hierarchy', () => ({
  UserRole: {
    ADMIN: 'ADMIN',
    GERENTE: 'GERENTE',
    FINANCEIRO: 'FINANCEIRO',
    ESTOQUE: 'ESTOQUE',
    USUARIO: 'USUARIO',
    CLIENTE: 'CLIENTE',
  },
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => handler),
}));

import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;

describe('REGRESSION USUARIOS-P2-004', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: 2, role: 'GERENTE', empresaId: 1 } as never);
  });

  it('GET delegacoes/:id bloqueia quando can(read)=false', async () => {
    mockCan.mockReturnValueOnce(false);

    const { GET } = await import('@/app/api/usuarios/delegacoes/[id]/route');
    const res = await GET(new NextRequest('http://localhost/api/usuarios/delegacoes/10'), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('PATCH delegacoes/:id bloqueia quando can(update)=false', async () => {
    mockCan.mockReturnValueOnce(false);

    const { PATCH } = await import('@/app/api/usuarios/delegacoes/[id]/route');
    const res = await PATCH(
      new NextRequest('http://localhost/api/usuarios/delegacoes/10', { method: 'PATCH' }),
      {
        params: Promise.resolve({ id: '10' }),
      },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
