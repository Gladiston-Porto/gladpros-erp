/**
 * @jest-environment node
 *
 * Unit tests for GET /api/projetos/[id]/historico
 * Covers: auth, RBAC, pagination, invalid ID, service call.
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

const mockListar = jest.fn();

jest.mock('@/domains/projects/services/ProjectHistoryService', () => ({
  ProjectHistoryService: jest.fn().mockImplementation(() => ({
    listar: (...args: unknown[]) => mockListar(...args),
  })),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { GET } from '@/app/api/projetos/[id]/historico/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const makeReq = (url: string) => new NextRequest(new URL(url, 'http://localhost:3000'));

const mockHistory = {
  data: [
    { id: 1, projetoId: 42, acao: 'STATUS_ALTERADO', usuarioId: 1, detalhe: {}, criadoEm: new Date().toISOString() },
  ],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

describe('GET /api/projetos/[id]/historico', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockRequireProjectAccess.mockResolvedValue(undefined);
    mockListar.mockResolvedValue(mockHistory);
  });

  it('returns 200 with history entries', async () => {
    const res = await GET(makeReq('http://localhost:3000/api/projetos/42/historico'), makeCtx('42'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(mockListar).toHaveBeenCalledWith(42, { projetoId: 42, pagina: 1, limite: 20 });
  });

  it('respects pagina and limite query params', async () => {
    await GET(
      makeReq('http://localhost:3000/api/projetos/42/historico?pagina=2&limite=50'),
      makeCtx('42'),
    );
    expect(mockListar).toHaveBeenCalledWith(42, { projetoId: 42, pagina: 2, limite: 50 });
  });

  it('returns 400 for non-numeric ID', async () => {
    const res = await GET(makeReq('http://localhost:3000/api/projetos/abc/historico'), makeCtx('abc'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid pagination params', async () => {
    const res = await GET(
      makeReq('http://localhost:3000/api/projetos/42/historico?pagina=0'),
      makeCtx('42'),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('enforces canViewHistory permission', async () => {
    mockRequireProjectPermission.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));
    await expect(
      GET(makeReq('http://localhost:3000/api/projetos/42/historico'), makeCtx('42')),
    ).rejects.toMatchObject({ status: 403 });
  });
});
