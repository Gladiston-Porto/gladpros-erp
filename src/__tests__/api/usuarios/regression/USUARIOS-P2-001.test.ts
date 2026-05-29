// @bug:USUARIOS-P2-001
// @description: Erros de sessions/toggle-status devem sempre retornar success:false.

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
    usuario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/shared/lib/security', () => ({
  SecurityService: {
    getUserSessions: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('@/app/api/usuarios/_helpers/access', () => ({
  checkUserManagementAccess: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      message: '',
    }),
  },
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

describe('REGRESSION USUARIOS-P2-001', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: 1, role: 'ADMIN', empresaId: 1 } as never);
    mockCan.mockReturnValue(true);
  });

  it('sessions/:id retorna success:false em erro de id invalido', async () => {
    const { GET } = await import('@/app/api/usuarios/[id]/sessions/route');
    const req = new NextRequest('http://localhost/api/usuarios/abc/sessions', { method: 'GET' });
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('toggle-status retorna success:false quando usuario nao existe', async () => {
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const { PUT } = await import('@/app/api/usuarios/[id]/toggle-status/route');
    const req = new NextRequest('http://localhost/api/usuarios/999/toggle-status', {
      method: 'PUT',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
