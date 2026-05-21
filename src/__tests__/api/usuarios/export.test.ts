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
    json() { return Promise.resolve(this._body); }
    static json(data: unknown, options?: { status?: number; headers?: Record<string, string> }) {
      return {
        status: options?.status ?? 200,
        headers: new Map(Object.entries(options?.headers ?? {})),
        json: () => Promise.resolve(data),
      };
    }
  }
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'POST').toUpperCase(),
      headers: { get: (name: string) => { const h = (init?.headers ?? {}) as Record<string, string>; return h[name] ?? h[name.toLowerCase()] ?? null; } },
      cookies: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockImplementation(() => {
        if (init?.body) { try { return Promise.resolve(JSON.parse(init.body)); } catch { return Promise.resolve({}); } }
        return Promise.resolve({});
      }),
    })),
    NextResponse: MockNextResponse,
  };
});

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([
      { COLUMN_NAME: 'id' },
      { COLUMN_NAME: 'email' },
      { COLUMN_NAME: 'nomeCompleto' },
      { COLUMN_NAME: 'role' },
      { COLUMN_NAME: 'status' },
      { COLUMN_NAME: 'criadoEm' },
    ]),
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
    isAllowed: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' }),
  },
}));

jest.mock('@/shared/lib/usuario-query', () => ({
  buildUsuarioSelect: jest.fn().mockResolvedValue('id, email, nomeCompleto, role, status, criadoEm'),
  getUsuarioColumns: jest.fn().mockResolvedValue(new Set(['id', 'email', 'nomeCompleto', 'nome', 'role', 'status', 'criadoEm'])),
}));

jest.mock('@/shared/lib/services/report-pdf-html', () => ({
  generateReportPDFFromHTML: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
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
import { apiRateLimit } from '@/shared/lib/rate-limit';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockRateLimit = apiRateLimit.isAllowed as jest.Mock;

function makePostRequest(body = {}) {
  return new NextRequest('http://localhost/api/usuarios/export/csv', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

describe('POST /api/usuarios/export/csv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = 'http://localhost:3000';
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
  });

  it('429 — rate limit atingido', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 60000, message: 'Too many requests' });
    const { POST } = await import('@/app/api/usuarios/export/csv/route');
    const res = await POST(makePostRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too Many Requests');
  });

  it('401 — sem autenticação', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { POST } = await import('@/app/api/usuarios/export/csv/route');
    const res = await POST(makePostRequest());
    expect(res.status).toBe(401);
  });

  it('403 — USUARIO sem permissão', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'USUARIO', email: 'u@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { POST } = await import('@/app/api/usuarios/export/csv/route');
    const res = await POST(makePostRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('403 — FINANCEIRO sem permissão', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'FINANCEIRO', email: 'f@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { POST } = await import('@/app/api/usuarios/export/csv/route');
    const res = await POST(makePostRequest());
    expect(res.status).toBe(403);
  });

  it('200 — ADMIN exporta CSV com dados', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      { id: 1, email: 'user@test.com', nomeCompleto: 'User Test', role: 'USUARIO', status: 'ATIVO', criadoEm: new Date() },
    ]);
    const { POST } = await import('@/app/api/usuarios/export/csv/route');
    const res = await POST(makePostRequest({ filters: {} }));
    // CSV returns a Response with Content-Type text/csv, not a JSON mock
    // The status should be 200 and content-type should include csv
    expect(res.status).toBe(200);
  });

  it('200 — GERENTE exporta CSV vazio (sem usuários)', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 2, role: 'GERENTE', email: 'g@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);
    const { POST } = await import('@/app/api/usuarios/export/csv/route');
    const res = await POST(makePostRequest({ filters: { role: 'USUARIO' } }));
    expect(res.status).toBe(200);
  });
});

// ─── PDF ─────────────────────────────────────────────────────────────────────

describe('POST /api/usuarios/export/pdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000, message: '' });
  });

  function makePdfRequest(body = {}) {
    return new NextRequest('http://localhost/api/usuarios/export/pdf', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  it('429 — rate limit atingido', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 60000, message: 'Too many requests' });
    const { POST } = await import('@/app/api/usuarios/export/pdf/route');
    const res = await POST(makePdfRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too Many Requests');
  });

  it('401 — sem autenticação', async () => {
    mockRequireUser.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const { POST } = await import('@/app/api/usuarios/export/pdf/route');
    const res = await POST(makePdfRequest());
    expect(res.status).toBe(401);
  });

  it('403 — USUARIO sem permissão', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 5, role: 'USUARIO', email: 'u@test.com' } as any);
    mockCan.mockReturnValueOnce(false);
    const { POST } = await import('@/app/api/usuarios/export/pdf/route');
    const res = await POST(makePdfRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('200 — ADMIN exporta PDF', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 1, role: 'ADMIN', email: 'a@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    const { POST } = await import('@/app/api/usuarios/export/pdf/route');
    const res = await POST(makePdfRequest({ filters: {}, filename: 'usuarios-report' }));
    expect(res.status).toBe(200);
  });

  it('200 — GERENTE exporta PDF com filtros', async () => {
    mockRequireUser.mockResolvedValueOnce({ id: 2, role: 'GERENTE', email: 'g@test.com' } as any);
    mockCan.mockReturnValueOnce(true);
    const { POST } = await import('@/app/api/usuarios/export/pdf/route');
    const res = await POST(makePdfRequest({ filters: { role: 'USUARIO', status: 'ATIVO' } }));
    expect(res.status).toBe(200);
  });
});
