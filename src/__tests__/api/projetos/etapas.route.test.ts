/**
 * @jest-environment node
 *
 * Unit tests for etapas routes:
 *   GET/POST  /api/projetos/[id]/etapas
 *   GET/PUT/DELETE/PATCH  /api/projetos/[id]/etapas/[etapaId]
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

jest.mock('@/domains/projects/services/ProjectStageService', () => ({
  ProjectStageService: jest.fn().mockImplementation(() => ({
    listarPorProjeto: mockListarPorProjeto,
    criar: mockCriar,
    buscarPorId: mockBuscarPorId,
    atualizar: mockAtualizar,
    excluir: mockExcluir,
    alterarStatus: mockAlterarStatus,
  })),
}));

jest.mock('@/domains/projects/validators', () => ({
  createProjetoEtapaSchema: { parse: jest.fn((v: unknown) => v) },
  updateProjetoEtapaSchema: { parse: jest.fn((v: unknown) => v) },
  alterarStatusEtapaSchema: { parse: jest.fn((v: unknown) => v) },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import {
  GET as getEtapas,
  POST as postEtapa,
} from '@/app/api/projetos/[id]/etapas/route';

import {
  GET as getEtapa,
  PUT as putEtapa,
  DELETE as deleteEtapa,
  PATCH as patchEtapa,
} from '@/app/api/projetos/[id]/etapas/[etapaId]/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const makeCtxEtapa = (id: string, etapaId: string) => ({
  params: Promise.resolve({ id, etapaId }),
});

describe('GET /api/projetos/[id]/etapas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockListarPorProjeto.mockResolvedValue([{ id: 1, nome: 'Etapa 1' }]);
  });

  it('returns 200 with etapas list', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas');
    const res = await getEtapas(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.etapas).toHaveLength(1);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/etapas');
    const res = await getEtapas(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas');

    await expect(getEtapas(req, makeCtx('1'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when no permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas');

    await expect(getEtapas(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('POST /api/projetos/[id]/etapas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockCriar.mockResolvedValue({ id: 1, nome: 'Nova Etapa' });
  });

  it('returns 201 with created etapa', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas', 'POST', {
      nome: 'Nova Etapa',
    });
    const res = await postEtapa(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.nome).toBe('Nova Etapa');
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/etapas', 'POST', {
      nome: 'Etapa',
    });
    const res = await postEtapa(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas', 'POST', {
      nome: 'Etapa',
    });

    await expect(postEtapa(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('GET /api/projetos/[id]/etapas/[etapaId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockBuscarPorId.mockResolvedValue({ id: 1, nome: 'Etapa A' });
  });

  it('returns 200 with etapa data', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/1');
    const res = await getEtapa(req, makeCtxEtapa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.nome).toBe('Etapa A');
  });

  it('returns 404 when etapa not found', async () => {
    mockBuscarPorId.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/999');
    const res = await getEtapa(req, makeCtxEtapa('1', '999'));

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid etapaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/abc');
    const res = await getEtapa(req, makeCtxEtapa('1', 'abc'));

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/projetos/[id]/etapas/[etapaId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockAtualizar.mockResolvedValue({ id: 1, nome: 'Etapa Atualizada' });
  });

  it('returns 200 with updated etapa', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/1', 'PUT', {
      nome: 'Etapa Atualizada',
    });
    const res = await putEtapa(req, makeCtxEtapa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.nome).toBe('Etapa Atualizada');
  });

  it('returns 400 for invalid etapaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/abc', 'PUT', {});
    const res = await putEtapa(req, makeCtxEtapa('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/1', 'PUT', {});

    await expect(putEtapa(req, makeCtxEtapa('1', '1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('DELETE /api/projetos/[id]/etapas/[etapaId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockExcluir.mockResolvedValue(undefined);
  });

  it('returns 200 on successful delete', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/1', 'DELETE');
    const res = await deleteEtapa(req, makeCtxEtapa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain('excluída');
  });

  it('returns 400 for invalid etapaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/abc', 'DELETE');
    const res = await deleteEtapa(req, makeCtxEtapa('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/1', 'DELETE');

    await expect(deleteEtapa(req, makeCtxEtapa('1', '1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('PATCH /api/projetos/[id]/etapas/[etapaId] (status)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockAlterarStatus.mockResolvedValue({ id: 1, status: 'concluida' });
  });

  it('returns 200 with updated status', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/1', 'PATCH', {
      status: 'concluida',
    });
    const res = await patchEtapa(req, makeCtxEtapa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('concluida');
  });

  it('returns 400 for invalid etapaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/abc', 'PATCH', {});
    const res = await patchEtapa(req, makeCtxEtapa('1', 'abc'));

    expect(res.status).toBe(400);
  });
});
