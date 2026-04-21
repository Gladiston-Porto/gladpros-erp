/**
 * @jest-environment node
 *
 * Unit tests for GET/PUT/DELETE /api/projetos/[id]
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectOwnershipPermission = jest.fn();
const mockShouldMaskFinancials = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectOwnershipPermission: (...args: unknown[]) => mockRequireProjectOwnershipPermission(...args),
  shouldMaskFinancials: (...args: unknown[]) => mockShouldMaskFinancials(...args),
}));

const mockBuscarPorId = jest.fn();
const mockAtualizar = jest.fn();
const mockExcluir = jest.fn();

jest.mock('@/domains/projects/services/ProjectService', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    buscarPorId: mockBuscarPorId,
    atualizar: mockAtualizar,
    excluir: mockExcluir,
  })),
}));

jest.mock('@/domains/projects/validators', () => ({
  updateProjetoSchema: { parse: jest.fn((v: unknown) => v) },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: {
      findUnique: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { GET, PUT, DELETE } from '@/app/api/projetos/[id]/route';
import { prisma } from '@/lib/prisma';

const mockPrismaFindUnique = prisma.projeto.findUnique as jest.Mock;

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/projetos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockShouldMaskFinancials.mockReturnValue(false);
  });

  it('returns 200 with project data', async () => {
    mockBuscarPorId.mockResolvedValue({ id: 1, titulo: 'Projeto A', responsavelId: 1 });
    const req = makeRequest('http://localhost:3000/api/projetos/1');
    const res = await GET(req, makeContext('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.titulo).toBe('Projeto A');
    expect(json.success).toBe(true);
  });

  it('returns 400 for invalid ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc');
    const res = await GET(req, makeContext('abc'));

    expect(res.status).toBe(400);
  });

  it('returns 404 when project not found', async () => {
    mockBuscarPorId.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/999');
    const res = await GET(req, makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('returns 403 when USUARIO is not responsavel', async () => {
    mockRequireProjectPermission.mockResolvedValue({ id: '5', role: 'USUARIO' });
    mockBuscarPorId.mockResolvedValue({ id: 1, titulo: 'Projeto A', responsavelId: 2 });

    const req = makeRequest('http://localhost:3000/api/projetos/1');
    const res = await GET(req, makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('masks financials when shouldMaskFinancials returns true', async () => {
    mockShouldMaskFinancials.mockReturnValue(true);
    mockBuscarPorId.mockResolvedValue({
      id: 1,
      titulo: 'Projeto',
      responsavelId: 1,
      orcamento: 10000,
      custoTotal: 5000,
    });

    const req = makeRequest('http://localhost:3000/api/projetos/1');
    const res = await GET(req, makeContext('1'));
    const json = await res.json();

    expect(json.data.orcamento).toBeUndefined();
    expect(json.data.custoTotal).toBeUndefined();
  });
});

describe('PUT /api/projetos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectOwnershipPermission.mockResolvedValue(adminUser);
    mockShouldMaskFinancials.mockReturnValue(false);
    mockPrismaFindUnique.mockResolvedValue({ id: 1, responsavelId: 1 });
  });

  it('returns 200 with updated project', async () => {
    mockAtualizar.mockResolvedValue({ id: 1, titulo: 'Updated' });
    const req = makeRequest('http://localhost:3000/api/projetos/1', 'PUT', {
      titulo: 'Updated',
    });
    const res = await PUT(req, makeContext('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.titulo).toBe('Updated');
    expect(json.success).toBe(true);
  });

  it('returns 400 for invalid ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc', 'PUT', {});
    const res = await PUT(req, makeContext('abc'));

    expect(res.status).toBe(400);
  });

  it('returns 404 when project not found', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/999', 'PUT', {});
    const res = await PUT(req, makeContext('999'));

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/projetos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
  });

  it('returns 200 on successful delete', async () => {
    mockExcluir.mockResolvedValue(undefined);
    const req = makeRequest('http://localhost:3000/api/projetos/1', 'DELETE');
    const res = await DELETE(req, makeContext('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('excluído');
  });

  it('returns 400 for invalid ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc', 'DELETE');
    const res = await DELETE(req, makeContext('abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for non-ADMIN roles', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1', 'DELETE');

    await expect(DELETE(req, makeContext('1'))).rejects.toThrow('FORBIDDEN');
  });
});
