/**
 * @jest-environment node
 * 
 * Unit tests for GET /api/projetos and POST /api/projetos
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockShouldMaskFinancials = jest.fn();
const mockGetProjectListScopeForUser = jest.fn((user: { id: string | number; role: string }) =>
  user.role === 'USUARIO' ? { responsavelId: Number(user.id) } : {}
);
const mockMaskProjectFinancials = jest.fn((projeto: Record<string, unknown>) => ({
  ...projeto,
  orcamento: undefined,
  custoTotal: undefined,
}));

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  shouldMaskFinancials: (...args: unknown[]) => mockShouldMaskFinancials(...args),
  getProjectListScopeForUser: (...args: unknown[]) => mockGetProjectListScopeForUser(...args),
  maskProjectFinancials: (...args: unknown[]) => mockMaskProjectFinancials(...args),
}));

const mockListar = jest.fn();
const mockCriar = jest.fn();

jest.mock('@/domains/projects/services/ProjectService', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    listar: mockListar,
    criar: mockCriar,
  })),
}));

jest.mock('@/domains/projects/validators', () => ({
  listarProjetosSchema: { parse: jest.fn((v: unknown) => v) },
  createProjetoSchema: { parse: jest.fn((v: unknown) => v) },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }),
  },
}));

import { GET, POST } from '@/app/api/projetos/route';

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const usuarioUser = { id: '5', role: 'USUARIO', email: 'user@test.com' };

describe('GET /api/projetos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockShouldMaskFinancials.mockReturnValue(false);
    mockListar.mockResolvedValue({
      data: [{ id: 1, titulo: 'Projeto A' }],
      paginacao: { paginaAtual: 1, porPagina: 20, totalItens: 1, totalPaginas: 1 },
    });
  });

  it('returns 200 with projects list', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.pagination).toBeDefined();
    expect(json.pagination.page).toBe(1);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos');

    await expect(GET(req)).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when no permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos');

    await expect(GET(req)).rejects.toThrow('FORBIDDEN');
  });

  it('filters by responsavelId for USUARIO role', async () => {
    mockRequireProjectPermission.mockResolvedValue(usuarioUser);
    const req = makeRequest('http://localhost:3000/api/projetos');
    await GET(req);

    expect(mockListar).toHaveBeenCalledWith(
      expect.objectContaining({ responsavelId: 5 })
    );
  });

  it('masks financials for restricted roles', async () => {
    mockShouldMaskFinancials.mockReturnValue(true);
    mockListar.mockResolvedValue({
      data: [{ id: 1, titulo: 'Projeto A', orcamento: 5000, custoTotal: 3000 }],
      paginacao: { paginaAtual: 1, porPagina: 20, totalItens: 1, totalPaginas: 1 },
    });

    const req = makeRequest('http://localhost:3000/api/projetos');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data[0].orcamento).toBeUndefined();
    expect(json.data[0].custoTotal).toBeUndefined();
  });
});

describe('POST /api/projetos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockShouldMaskFinancials.mockReturnValue(false);
    mockCriar.mockResolvedValue({ id: 1, titulo: 'Novo Projeto' });
  });

  it('returns 201 with created project', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos', 'POST', {
      titulo: 'Novo Projeto',
      clienteId: 1,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.titulo).toBe('Novo Projeto');
  });

  it('throws FORBIDDEN for USUARIO role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos', 'POST', {
      titulo: 'Novo Projeto',
    });

    await expect(POST(req)).rejects.toThrow('FORBIDDEN');
  });

  it('masks financials in response when needed', async () => {
    mockShouldMaskFinancials.mockReturnValue(true);
    mockCriar.mockResolvedValue({
      id: 1,
      titulo: 'Projeto',
      orcamento: 10000,
      custoTotal: 5000,
    });

    const req = makeRequest('http://localhost:3000/api/projetos', 'POST', {
      titulo: 'Projeto',
      clienteId: 1,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.data.orcamento).toBeUndefined();
    expect(json.data.custoTotal).toBeUndefined();
  });
});
