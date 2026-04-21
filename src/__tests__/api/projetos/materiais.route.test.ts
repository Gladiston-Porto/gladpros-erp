/**
 * @jest-environment node
 *
 * Unit tests for materiais routes:
 *   GET/POST  /api/projetos/[id]/materiais
 *   GET/PUT/DELETE/PATCH  /api/projetos/[id]/materiais/[materialId]
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
}));

const mockListarPorProjeto = jest.fn();
const mockCriar = jest.fn();
const mockBuscarPorId = jest.fn();
const mockAtualizar = jest.fn();
const mockExcluir = jest.fn();
const mockAlterarStatus = jest.fn();

jest.mock('@/domains/projects/services/ProjectMaterialService', () => ({
  ProjectMaterialService: jest.fn().mockImplementation(() => ({
    listarPorProjeto: mockListarPorProjeto,
    criar: mockCriar,
    buscarPorId: mockBuscarPorId,
    atualizar: mockAtualizar,
    excluir: mockExcluir,
    alterarStatus: mockAlterarStatus,
  })),
}));

jest.mock('@/domains/projects/validators', () => ({
  createProjetoMaterialSchema: { parse: jest.fn((v: unknown) => v) },
  updateProjetoMaterialSchema: { parse: jest.fn((v: unknown) => v) },
  alterarStatusMaterialSchema: { parse: jest.fn((v: unknown) => v) },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import {
  GET as getMateriaisList,
  POST as postMaterial,
} from '@/app/api/projetos/[id]/materiais/route';

import {
  GET as getMaterial,
  PUT as putMaterial,
  DELETE as deleteMaterial,
  PATCH as patchMaterial,
} from '@/app/api/projetos/[id]/materiais/[materialId]/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const makeCtxMaterial = (id: string, materialId: string) => ({
  params: Promise.resolve({ id, materialId }),
});

describe('GET /api/projetos/[id]/materiais', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockListarPorProjeto.mockResolvedValue([{ id: 1, nome: 'Material A', quantidade: 10 }]);
  });

  it('returns 200 with materiais list', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais');
    const res = await getMateriaisList(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.materiais).toHaveLength(1);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/materiais');
    const res = await getMateriaisList(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais');

    await expect(getMateriaisList(req, makeCtx('1'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when no permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais');

    await expect(getMateriaisList(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('POST /api/projetos/[id]/materiais', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockCriar.mockResolvedValue({ id: 1, nome: 'Novo Material', quantidade: 5 });
  });

  it('returns 201 with created material', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais', 'POST', {
      nome: 'Novo Material',
      quantidade: 5,
    });
    const res = await postMaterial(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.nome).toBe('Novo Material');
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/materiais', 'POST', {
      nome: 'Material',
    });
    const res = await postMaterial(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais', 'POST', {
      nome: 'Material',
    });

    await expect(postMaterial(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('GET /api/projetos/[id]/materiais/[materialId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockBuscarPorId.mockResolvedValue({ id: 1, nome: 'Material A', quantidade: 10 });
  });

  it('returns 200 with material data', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1');
    const res = await getMaterial(req, makeCtxMaterial('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.nome).toBe('Material A');
  });

  it('returns 404 when material not found', async () => {
    mockBuscarPorId.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/999');
    const res = await getMaterial(req, makeCtxMaterial('1', '999'));

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid materialId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/abc');
    const res = await getMaterial(req, makeCtxMaterial('1', 'abc'));

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/projetos/[id]/materiais/[materialId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockAtualizar.mockResolvedValue({ id: 1, nome: 'Material Atualizado', quantidade: 20 });
  });

  it('returns 200 with updated material', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1', 'PUT', {
      quantidade: 20,
    });
    const res = await putMaterial(req, makeCtxMaterial('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.nome).toBe('Material Atualizado');
  });

  it('returns 400 for invalid materialId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/abc', 'PUT', {});
    const res = await putMaterial(req, makeCtxMaterial('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1', 'PUT', {});

    await expect(putMaterial(req, makeCtxMaterial('1', '1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('DELETE /api/projetos/[id]/materiais/[materialId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockExcluir.mockResolvedValue(undefined);
  });

  it('returns 200 on successful delete', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1', 'DELETE');
    const res = await deleteMaterial(req, makeCtxMaterial('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain('excluído');
  });

  it('returns 400 for invalid materialId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/abc', 'DELETE');
    const res = await deleteMaterial(req, makeCtxMaterial('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1', 'DELETE');

    await expect(deleteMaterial(req, makeCtxMaterial('1', '1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('PATCH /api/projetos/[id]/materiais/[materialId] (status/liberação/devolução)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockAlterarStatus.mockResolvedValue({ id: 1, status: 'liberado' });
  });

  it('returns 200 with updated status (liberação)', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1', 'PATCH', {
      status: 'liberado',
    });
    const res = await patchMaterial(req, makeCtxMaterial('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('liberado');
  });

  it('returns 200 with updated status (devolução)', async () => {
    mockAlterarStatus.mockResolvedValue({ id: 1, status: 'devolvido' });
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1', 'PATCH', {
      status: 'devolvido',
    });
    const res = await patchMaterial(req, makeCtxMaterial('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('devolvido');
  });

  it('returns 400 for invalid materialId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/abc', 'PATCH', {});
    const res = await patchMaterial(req, makeCtxMaterial('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/materiais/1', 'PATCH', {
      status: 'liberado',
    });

    await expect(patchMaterial(req, makeCtxMaterial('1', '1'))).rejects.toThrow('FORBIDDEN');
  });
});
