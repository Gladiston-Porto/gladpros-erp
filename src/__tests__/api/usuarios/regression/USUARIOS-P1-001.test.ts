// @bug:USUARIOS-P1-001
// @description: Evita consulta direta a INFORMATION_SCHEMA no export CSV de usuarios.

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Map<string, string>;
    _body: unknown;

    constructor(body: unknown, options?: { status?: number; headers?: Record<string, string> }) {
      this.status = options?.status ?? 200;
      this.headers = new Map(Object.entries(options?.headers ?? {}));
      this._body = body;
    }

    json() {
      return Promise.resolve(this._body);
    }

    static json(data: unknown, options?: { status?: number; headers?: Record<string, string> }) {
      return {
        status: options?.status ?? 200,
        headers: new Map(Object.entries(options?.headers ?? {})),
        json: () => Promise.resolve(data),
      };
    }
  }

  return {
    NextRequest: jest
      .fn()
      .mockImplementation((url: string, init?: { method?: string; body?: string }) => ({
        url,
        method: (init?.method ?? 'POST').toUpperCase(),
        headers: { get: jest.fn().mockReturnValue(null) },
        json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
      })),
    NextResponse: MockNextResponse,
  };
});

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/shared/lib/rbac-core', () => ({
  can: jest.fn(),
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

jest.mock('@/shared/lib/usuario-query', () => ({
  buildUsuarioSelect: jest.fn().mockResolvedValue('id,email,nomeCompleto,status,criadoEm'),
  getUsuarioColumns: jest
    .fn()
    .mockResolvedValue(new Set(['id', 'email', 'nomeCompleto', 'status', 'criadoEm', 'empresaId'])),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => handler),
}));

jest.mock('@/lib/utils/retry', () => ({
  withRetry: jest.fn().mockImplementation(async (fn: Function) => await fn()),
}));

import { requireUser } from '@/shared/lib/rbac';
import { can } from '@/shared/lib/rbac-core';
import { prisma } from '@/lib/prisma';
import { getUsuarioColumns } from '@/shared/lib/usuario-query';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;

describe('REGRESSION USUARIOS-P1-001', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: 1, role: 'ADMIN', empresaId: 1 } as never);
    mockCan.mockReturnValue(true);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);
  });

  it('usa cache de colunas e nao toca INFORMATION_SCHEMA diretamente', async () => {
    const { POST } = await import('@/app/api/usuarios/export/csv/route');
    const req = new NextRequest('http://localhost/api/usuarios/export/csv', {
      method: 'POST',
      body: JSON.stringify({ filters: {} }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(getUsuarioColumns).toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
