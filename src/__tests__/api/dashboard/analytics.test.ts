import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string, options?: unknown) => ({
    url,
    json: jest.fn(),
    headers: { get: jest.fn() },
    ...(options as object),
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
      status: options?.status || 200,
      json: jest.fn().mockResolvedValue(data),
      _data: data,
    })),
  },
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    usuario: { count: jest.fn(), groupBy: jest.fn() },
    cliente: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    proposta: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    tentativaLogin: { count: jest.fn() },
    auditoria: { count: jest.fn(), groupBy: jest.fn(), findFirst: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../../../shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

jest.mock('../../../shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true, message: '', resetTime: Date.now() + 60_000 }),
  },
}));

jest.mock('../../../shared/lib/cache/business-cache', () => ({
  withBusinessCache: jest.fn().mockImplementation((_key: string, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('../../../lib/api/error-handler', () => ({
  withErrorHandler:
    (handler: (...args: unknown[]) => Promise<unknown>) =>
    (...args: unknown[]) =>
      handler(...args).catch(() => {
        const NextResponseMock = require('next/server').NextResponse;
        return NextResponseMock.json({ error: 'Erro interno', success: false }, { status: 500 });
      }),
}));

type MockResponse = { status: number; _data: Record<string, unknown> };

const buildRequest = (url = 'http://localhost:3000/api/analytics?period=30d&role=all') =>
  new NextRequest(url) as unknown as NextRequest;

describe('GET /api/analytics', () => {
  let prisma: ReturnType<typeof require>;
  let requireUser: jest.Mock;
  let can: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = require('../../../lib/prisma').prisma;
    const rbac = require('../../../shared/lib/rbac');
    requireUser = rbac.requireUser;
    can = rbac.can;

    requireUser.mockResolvedValue({ id: 1, role: 'ADMIN' });
    can.mockImplementation((_role: string, module: string) => module === 'dashboard' || module === 'analytics');

    prisma.usuario.count.mockResolvedValue(10);
    prisma.cliente.count.mockResolvedValue(5);
    prisma.proposta.count.mockResolvedValue(8);
    prisma.tentativaLogin.count.mockResolvedValue(20);
    prisma.auditoria.count.mockResolvedValue(7);
    prisma.cliente.groupBy.mockResolvedValue([{ status: 'ATIVO', _count: { status: 5 } }]);
    prisma.proposta.groupBy.mockResolvedValue([{ status: 'APROVADA', _count: { status: 3 } }]);
    prisma.auditoria.groupBy.mockResolvedValue([{ acao: 'LOGIN', _count: { acao: 4 } }]);
    prisma.usuario.groupBy.mockResolvedValue([{ nivel: 'ADMIN', _count: { nivel: 2 } }]);
    prisma.proposta.findMany.mockResolvedValue([]);
    prisma.cliente.findMany.mockResolvedValue([]);
    prisma.auditoria.findFirst.mockResolvedValue({ criadoEm: new Date('2026-01-01T10:00:00.000Z') });
    prisma.$queryRaw
      .mockResolvedValueOnce([{ date: '2026-01-01', attempts: 5n, successful: 4n, failed: 1n }])
      .mockResolvedValueOnce([{ month: '2026-01', label: 'Jan', propostas: 3n }])
      .mockResolvedValueOnce([{ month: '2026-01', label: 'Jan', usuarios: 2n }])
      .mockResolvedValueOnce([{ month: '2026-01', label: 'Jan', ativos: 2n }]);
  });

  test('403 — sem acesso a dashboard/analytics', async () => {
    can.mockReturnValue(false);
    const { GET } = require('../../../app/api/analytics/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(403);
  });

  test('400 — period inválido', async () => {
    const { GET } = require('../../../app/api/analytics/route');
    const res = (await GET(buildRequest('http://localhost:3000/api/analytics?period=bad'))) as MockResponse;
    expect(res.status).toBe(400);
  });

  test('200 — perfil sem analytics recebe payload restrito', async () => {
    can.mockImplementation((_role: string, module: string) => module === 'dashboard');
    const { GET } = require('../../../app/api/analytics/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(200);

    const body = res._data.data as Record<string, unknown>;
    const overview = body.overview as Record<string, unknown>;
    const permissions = body.permissions as Record<string, unknown>;
    expect(permissions.canReadAnalytics).toBe(false);
    expect(overview.loginAttempts).toBeNull();
    expect(overview.failedLogins).toBeNull();
    expect(overview.auditEvents).toBeNull();
  });

  test('200 — analytics habilitado retorna telemetria', async () => {
    const { GET } = require('../../../app/api/analytics/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(200);

    const body = res._data.data as Record<string, unknown>;
    const overview = body.overview as Record<string, unknown>;
    const permissions = body.permissions as Record<string, unknown>;
    expect(permissions.canReadAnalytics).toBe(true);
    expect(overview.loginAttempts).toBe(20);
    expect(overview.auditEvents).toBe(7);
  });
});

