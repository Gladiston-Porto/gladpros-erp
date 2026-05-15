/**
 * @jest-environment node
 *
 * Unit tests for movimentacoes route:
 *   GET /api/projetos/[id]/movimentacoes
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

const mockListar = jest.fn();

jest.mock('@/domains/projects/services/inventory-movement.service', () => ({
  InventoryMovementService: jest.fn().mockImplementation(() => ({
    listar: mockListar,
  })),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { GET } from '@/app/api/projetos/[id]/movimentacoes/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method: 'GET' });
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

const defaultMovimentacoes = {
  data: [
    { id: 1, tipo: 'LIBERACAO', status: 'CONCLUIDA', quantidade: 5 },
    { id: 2, tipo: 'DEVOLUCAO', status: 'PENDENTE', quantidade: 2 },
  ],
  paginacao: {
    paginaAtual: 1,
    totalPaginas: 1,
    totalItens: 2,
    itensPorPagina: 20,
  },
};

describe('GET /api/projetos/[id]/movimentacoes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockListar.mockResolvedValue(defaultMovimentacoes);
  });

  it('returns 200 with movimentacoes list', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/movimentacoes');
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/movimentacoes');
    const res = await GET(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/movimentacoes');

    await expect(GET(req, makeCtx('1'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when no permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/movimentacoes');

    await expect(GET(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });

  it('filters by tipoMovimentacao query param', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/movimentacoes?tipo=LIBERACAO',
    );
    await GET(req, makeCtx('1'));

    expect(mockListar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoMovimentacao: 'LIBERACAO' }),
    );
  });

  it('filters by statusIntegracao query param', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/movimentacoes?status=CONCLUIDA',
    );
    await GET(req, makeCtx('1'));

    expect(mockListar).toHaveBeenCalledWith(
      expect.objectContaining({ statusIntegracao: 'CONCLUIDA' }),
    );
  });

  it('applies pagination with pagina and limite params', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/movimentacoes?pagina=2&limite=10',
    );
    await GET(req, makeCtx('1'));

    expect(mockListar).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 2, limite: 10 }),
    );
  });

  it('returns 400 when limite is above 100', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/movimentacoes?limite=500',
    );
    const res = await GET(req, makeCtx('1'));

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid materialId param', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/movimentacoes?materialId=abc',
    );
    const res = await GET(req, makeCtx('1'));

    expect(res.status).toBe(400);
  });

  it('filters by date range', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/movimentacoes?dataInicio=2024-01-01T00:00:00.000Z&dataFim=2024-12-31T00:00:00.000Z',
    );
    await GET(req, makeCtx('1'));

    expect(mockListar).toHaveBeenCalledWith(
      expect.objectContaining({
        dataInicio: expect.any(Date),
        dataFim: expect.any(Date),
      }),
    );
  });

  it('returns 400 for invalid dataInicio', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/movimentacoes?dataInicio=not-a-date',
    );
    const res = await GET(req, makeCtx('1'));

    expect(res.status).toBe(400);
  });
});
