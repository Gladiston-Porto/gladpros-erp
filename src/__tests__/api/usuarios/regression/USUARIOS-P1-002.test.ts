// @bug:USUARIOS-P1-002
// @description: Garante consistencia entre endpoints de alteracao de status (toggle/status).

jest.mock('next/server', () => ({
  NextRequest: jest
    .fn()
    .mockImplementation(
      (
        url: string,
        init?: { method?: string; body?: string; headers?: Record<string, string> },
      ) => ({
        url,
        method: (init?.method ?? 'PUT').toUpperCase(),
        headers: {
          get: (name: string) => {
            const h = (init?.headers ?? {}) as Record<string, string>;
            return h[name] ?? h[name.toLowerCase()] ?? null;
          },
        },
        json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
      }),
    ),
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
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
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
  canManageRole: jest.fn().mockReturnValue(true),
}));

jest.mock('@/shared/lib/validation', () => ({
  toggleUserStatusSchema: {
    safeParse: jest.fn().mockImplementation((data: unknown) => ({ success: true, data })),
  },
}));

jest.mock('@/shared/lib/audit', () => ({
  AuditLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => handler),
}));

import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;

describe('REGRESSION USUARIOS-P1-002', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: 1, role: 'ADMIN', empresaId: 1 } as never);
    mockCan.mockReturnValue(true);
  });

  it('toggle-status desativa com tokenVersion increment e retorna success', async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 5,
      status: 'ATIVO',
      email: 'u@test.com',
      nivel: 'USUARIO',
    });
    (prisma.usuario.update as jest.Mock).mockResolvedValueOnce({ id: 5, status: 'INATIVO' });

    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    const req = new NextRequest('http://localhost/api/usuarios/5/toggle-status', { method: 'PUT' });
    const res = await PUT(req, { params: Promise.resolve({ id: '5' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INATIVO',
          tokenVersion: { increment: 1 },
        }),
      }),
    );
  });

  it('status endpoint desativa com SQL contendo tokenVersion e retorna success', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ nivel: 'USUARIO', status: 'ATIVO' }]);
    (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1);

    const { PATCH } = await import('@/app/api/usuarios/[id]/status/route');
    const req = new NextRequest('http://localhost/api/usuarios/5/status', {
      method: 'PATCH',
      body: JSON.stringify({ ativo: false }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: '5' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const sqlParts = (prisma.$executeRaw as jest.Mock).mock.calls[0][0] as TemplateStringsArray;
    expect(sqlParts.join(' ')).toContain('tokenVersion');
  });
});
