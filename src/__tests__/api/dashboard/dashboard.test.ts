/**
 * Testes unitários — GET /api/dashboard
 * Cobertura: auth, RBAC, happy path, N+1 fix, erro interno.
 */
import { NextRequest, NextResponse } from 'next/server';

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
    proposta: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    cliente: { count: jest.fn(), findMany: jest.fn() },
    projeto: { count: jest.fn(), groupBy: jest.fn() },
    invoice: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    serviceOrder: { groupBy: jest.fn() },
    domainEvent: { findMany: jest.fn() },
  },
}));

jest.mock('../../../shared/lib/rbac', () => ({
  requireUser: jest.fn(),
}));

jest.mock('../../../shared/lib/rbac-core', () => ({
  can: jest.fn(),
}));

jest.mock('../../../shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest
      .fn()
      .mockResolvedValue({ allowed: true, message: '', resetTime: Date.now() + 60_000 }),
  },
}));

// withErrorHandler just calls through the handler
jest.mock('../../../lib/api/error-handler', () => ({
  withErrorHandler:
    (handler: (...args: unknown[]) => Promise<unknown>) =>
    (...args: unknown[]) =>
      handler(...args).catch((err: unknown) => {
        const NextResponseMock = require('next/server').NextResponse;
        if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
          return NextResponseMock.json({ error: 'Unauthorized', success: false }, { status: 401 });
        }
        return NextResponseMock.json({ error: 'Erro interno', success: false }, { status: 500 });
      }),
}));

const buildRequest = (url = 'http://localhost:3000/api/dashboard?period=30d') =>
  new NextRequest(url) as unknown as NextRequest;

describe('GET /api/dashboard', () => {
  let prisma: ReturnType<typeof require>;
  let requireUser: jest.Mock;
  let can: jest.Mock;

  let _GET: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = require('../../../lib/prisma').prisma;
    requireUser = require('../../../shared/lib/rbac').requireUser;
    can = require('../../../shared/lib/rbac-core').can;

    // Default happy-path mocks
    requireUser.mockResolvedValue({ id: 1, role: 'ADMIN', empresaId: 7 });
    can.mockReturnValue(true);

    prisma.proposta.count.mockResolvedValue(10);
    prisma.proposta.groupBy.mockResolvedValue([
      { status: 'ENVIADA', _count: 3 },
      { status: 'APROVADA', _count: 5 },
    ]);
    prisma.cliente.count.mockResolvedValue(20);
    prisma.projeto.count.mockResolvedValue(5);
    prisma.projeto.groupBy.mockResolvedValue([{ status: 'em_execucao', _count: 3 }]);
    prisma.invoice.aggregate.mockResolvedValue({
      _sum: { valorTotal: 50000, saldo: 10000 },
      _count: 8,
    });
    prisma.invoice.groupBy.mockResolvedValue([
      { clienteId: 1, _count: 2, _sum: { valorTotal: 20000 } },
    ]);
    prisma.serviceOrder.groupBy.mockResolvedValue([]);
    prisma.domainEvent.findMany.mockResolvedValue([]);
    prisma.cliente.findMany.mockResolvedValue([
      { id: 1, nomeFantasia: 'Acme Corp', nomeCompleto: 'Acme Corporation' },
    ]);

    // Re-import to get fresh GET handler
    jest.isolateModules(() => {
      ({ GET } = require('../../../app/api/dashboard/route'));
    });
  });

  test('401 — sem autenticação (requireUser lança UNAUTHENTICATED)', async () => {
    requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { GET: handler } = require('../../../app/api/dashboard/route');
    const res = await handler(buildRequest());
    expect(res.status).toBe(401);
    expect((res as unknown as { _data: { success: boolean } })._data.success).toBe(false);
  });

  test('403 — role sem permissão (CLIENTE)', async () => {
    requireUser.mockResolvedValue({ id: 6, role: 'CLIENTE' });
    can.mockReturnValue(false);

    const { GET: handler } = require('../../../app/api/dashboard/route');
    const res = await handler(buildRequest());
    expect(res.status).toBe(403);
    expect((res as unknown as { _data: { success: boolean } })._data.success).toBe(false);
  });

  test('200 — ADMIN acessa com sucesso', async () => {
    const { GET: handler } = require('../../../app/api/dashboard/route');
    const res = await handler(buildRequest());
    expect(res.status).toBe(200);

    const data = (res as unknown as { _data: { success: boolean; data: unknown } })._data;
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  test('200 — can() recebe o módulo "dashboard"', async () => {
    const { GET: handler } = require('../../../app/api/dashboard/route');
    await handler(buildRequest());

    expect(can).toHaveBeenCalledWith('ADMIN', 'dashboard', 'read');
  });

  test('@bug:DASHBOARD-P1-001 — queries operacionais usam empresaId do usuário', async () => {
    const { GET: handler } = require('../../../app/api/dashboard/route');
    await handler(buildRequest());

    expect(prisma.proposta.count).toHaveBeenCalledWith({
      where: { empresaId: 7, deletedAt: null },
    });
    expect(prisma.proposta.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { empresaId: 7, deletedAt: null },
      _count: true,
    });
    expect(prisma.cliente.count).toHaveBeenCalledWith({ where: { empresaId: 7 } });
    expect(prisma.projeto.count).toHaveBeenCalledWith({ where: { Cliente: { empresaId: 7 } } });
    expect(prisma.projeto.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { Cliente: { empresaId: 7 } },
      _count: true,
    });
    expect(prisma.serviceOrder.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { empresaId: 7 },
      _count: true,
    });
    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1] }, empresaId: 7 },
      select: { id: true, nomeFantasia: true, nomeCompleto: true },
    });
  });

  test('500 — erro interno do Prisma', async () => {
    prisma.proposta.count.mockRejectedValue(new Error('DB connection failed'));

    const { GET: handler } = require('../../../app/api/dashboard/route');
    const res = await handler(buildRequest());
    expect(res.status).toBe(500);
    expect((res as unknown as { _data: { success: boolean } })._data.success).toBe(false);
  });

  test('sem N+1 — cliente.findMany chamado apenas uma vez', async () => {
    const { GET: handler } = require('../../../app/api/dashboard/route');
    await handler(buildRequest());

    // findMany deve ser chamado no máximo 1x para resolver os top clients
    // (jamais dentro de loop — que seria múltiplas chamadas a findUnique)
    const calls = prisma.cliente.findMany.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(1);
  });

  test('period padrão "30d" é usado quando não fornecido', async () => {
    const { GET: handler } = require('../../../app/api/dashboard/route');
    await handler(new NextRequest('http://localhost:3000/api/dashboard') as unknown as NextRequest);

    expect(prisma.proposta.count).toHaveBeenCalled();
  });

  test('400 — period inválido retorna erro de validação', async () => {
    const { GET: handler } = require('../../../app/api/dashboard/route');
    const res = await handler(
      new NextRequest('http://localhost:3000/api/dashboard?period=foo') as unknown as NextRequest,
    );
    expect(res.status).toBe(400);
    expect((res as unknown as { _data: { success: boolean } })._data.success).toBe(false);
  });

  test('200 — sem permissão financeira retorna revenue nulo e topClients vazio', async () => {
    can.mockImplementation((role: string, module: string) => {
      if (module === 'dashboard') return true;
      if (module === 'financeiro') return false;
      return false;
    });

    const { GET: handler } = require('../../../app/api/dashboard/route');
    const res = await handler(buildRequest());
    expect(res.status).toBe(200);

    const body = (res as unknown as { _data: { data: Record<string, unknown> } })._data;
    expect(body.data.revenue).toBeNull();
    expect(body.data.topClients).toEqual([]);
    expect(body.data.permissions).toEqual({ canViewFinancials: false });
  });

  test('200 — response contém estrutura esperada', async () => {
    const { GET: handler } = require('../../../app/api/dashboard/route');
    const res = await handler(buildRequest());
    const body = (res as unknown as { _data: Record<string, unknown> })._data;

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('totalProposals');
    expect(body.data).toHaveProperty('totalClients');
    expect(body.data).toHaveProperty('revenue');
    expect(body.data).toHaveProperty('recentActivity');
    expect(body.data).toHaveProperty('topClients');
  });
});
