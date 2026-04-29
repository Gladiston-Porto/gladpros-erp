/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Testes unitários — GET /api/dashboard/executive
 * Cobertura: auth, RBAC, happy path, cache, erro interno.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Projeto_status } from '@prisma/client';

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
    revenue: { aggregate: jest.fn(), findMany: jest.fn() },
    expense: { aggregate: jest.fn() },
    bankAccount: { aggregate: jest.fn() },
    material: { aggregate: jest.fn() },
    materialSaldo: { aggregate: jest.fn() },
    materialMovimentacao: { count: jest.fn() },
    projeto: { findMany: jest.fn() },
    worker: { count: jest.fn() },
    cliente: { aggregate: jest.fn(), findMany: jest.fn() },
    proposta: { groupBy: jest.fn(), findMany: jest.fn() },
    invoice: { aggregate: jest.fn() },
  },
}));

jest.mock('../../../shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

jest.mock('@prisma/client', () => ({
  Projeto_status: {
    em_execucao: 'em_execucao',
    planejado: 'planejado',
    em_inspecao: 'em_inspecao',
    aguardando_devolucoes: 'aguardando_devolucoes',
    concluido: 'concluido',
  },
}));

// Business cache: pass through in tests
jest.mock('../../../shared/lib/cache/business-cache', () => ({
  withBusinessCache: jest.fn().mockImplementation(
    (_key: string, fn: () => Promise<unknown>) => fn()
  ),
}));

// withErrorHandler: call through
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

type MockResponse = { status: number; _data: Record<string, unknown> };

const buildRequest = (url = 'http://localhost:3000/api/dashboard/executive?period=30d') =>
  new NextRequest(url) as unknown as NextRequest;

describe('GET /api/dashboard/executive', () => {
  let prisma: ReturnType<typeof require>;
  let requireUser: jest.Mock;
  let can: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = require('../../../lib/prisma').prisma;
    requireUser = require('../../../shared/lib/rbac').requireUser;
    can = require('../../../shared/lib/rbac-core') as unknown as { can: jest.Mock };

    // Override require for rbac module
    const rbac = require('../../../shared/lib/rbac');
    requireUser = rbac.requireUser;
    can = rbac.can;

    requireUser.mockResolvedValue({ id: 1, role: 'ADMIN' });
    can.mockReturnValue(true);

    // Prisma defaults
    prisma.revenue.aggregate.mockResolvedValue({ _sum: { valor: 100000 }, _count: 5 });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { valor: 50000 }, _count: 3 });
    prisma.bankAccount.aggregate.mockResolvedValue({ _sum: { saldoAtual: 200000 }, _count: 2 });
    prisma.material.aggregate.mockResolvedValue({ _count: 50 });
    prisma.materialSaldo.aggregate.mockResolvedValue({ _sum: { quantidade: 200 } });
    prisma.materialMovimentacao.count.mockResolvedValue(10);
    prisma.projeto.findMany.mockResolvedValue([
      {
        id: 1,
        titulo: 'Projeto Teste',
        status: Projeto_status.em_execucao,
        prioridade: 'ALTA',
        dataInicioPrevista: new Date('2024-01-01'),
        dataConclusaoPrevista: new Date('2025-12-31'),
        valorEstimado: 50000,
        custoReal: 30000,
      },
    ]);
    prisma.worker.count.mockResolvedValue(8);
    prisma.cliente.aggregate.mockResolvedValue({ _count: 25 });
    prisma.cliente.findMany.mockResolvedValue([]);
    prisma.proposta.groupBy.mockResolvedValue([
      { status: 'APROVADA', _count: 10 },
      { status: 'ENVIADA', _count: 5 },
    ]);
    prisma.proposta.findMany.mockResolvedValue([]);
    prisma.invoice.aggregate.mockResolvedValue({ _count: 12, _sum: { valorTotal: 80000 } });
    prisma.revenue.findMany.mockResolvedValue([]);
  });

  test('401 — sem autenticação', async () => {
    requireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { GET } = require('../../../app/api/dashboard/executive/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(401);
    expect(res._data.success).toBe(false);
  });

  test('403 — CLIENTE não tem permissão', async () => {
    requireUser.mockResolvedValue({ id: 6, role: 'CLIENTE' });
    can.mockReturnValue(false);

    const { GET } = require('../../../app/api/dashboard/executive/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(403);
    expect(res._data.success).toBe(false);
  });

  test('200 — ADMIN acessa com sucesso', async () => {
    const { GET } = require('../../../app/api/dashboard/executive/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(200);
    expect(res._data.success).toBe(true);
  });

  test('200 — response tem estrutura data.kpis completa', async () => {
    const { GET } = require('../../../app/api/dashboard/executive/route');
    const res = (await GET(buildRequest())) as MockResponse;

    const data = res._data.data as Record<string, unknown>;
    expect(data).toBeDefined();
    expect(data.kpis).toBeDefined();
    const kpis = data.kpis as Record<string, unknown>;
    expect(kpis.receitaTotal).toBeDefined();
    expect(kpis.despesaTotal).toBeDefined();
    expect(kpis.projetosAtivos).toBeDefined();
    expect(kpis.workersAtivos).toBeDefined();
  });

  test('200 — response contém projetos e alertas', async () => {
    const { GET } = require('../../../app/api/dashboard/executive/route');
    const res = (await GET(buildRequest())) as MockResponse;

    const data = res._data.data as Record<string, unknown>;
    expect(Array.isArray(data.projetos)).toBe(true);
    expect(Array.isArray(data.alertas)).toBe(true);
  });

  test('200 — queries disparadas em paralelo (Promise.all)', async () => {
    const { GET } = require('../../../app/api/dashboard/executive/route');
    await GET(buildRequest());

    // Todos os modelos devem ter sido chamados
    expect(prisma.revenue.aggregate).toHaveBeenCalledTimes(2); // current + previous period
    expect(prisma.expense.aggregate).toHaveBeenCalledTimes(2);
    expect(prisma.projeto.findMany).toHaveBeenCalledTimes(1);
  });

  test('500 — erro interno retorna { success: false }', async () => {
    // Use requireUser rejection to trigger 500 without abandoned promise rejections
    // (prisma.revenue.aggregate is called 3x in Promise.all — mockRejectedValue on it
    //  would create multiple abandoned rejections crashing Node.js 20)
    requireUser.mockRejectedValue(new Error('Database connection failed'));

    const { GET } = require('../../../app/api/dashboard/executive/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(500);
    expect(res._data.success).toBe(false);
  });

  test('GERENTE acessa com sucesso (RO)', async () => {
    requireUser.mockResolvedValue({ id: 2, role: 'GERENTE' });
    can.mockReturnValue(true);

    const { GET } = require('../../../app/api/dashboard/executive/route');
    const res = (await GET(buildRequest())) as MockResponse;
    expect(res.status).toBe(200);
  });

  test('period "7d" e "90d" são aceitos', async () => {
    const { GET } = require('../../../app/api/dashboard/executive/route');

    const res7d = (await GET(
      buildRequest('http://localhost:3000/api/dashboard/executive?period=7d')
    )) as MockResponse;
    expect(res7d.status).toBe(200);

    const res90d = (await GET(
      buildRequest('http://localhost:3000/api/dashboard/executive?period=90d')
    )) as MockResponse;
    expect(res90d.status).toBe(200);
  });
});
