/**
 * @jest-environment node
 *
 * Unit tests for tarefas routes:
 *   GET/POST  /api/projetos/[id]/tarefas
 *   GET/PUT/DELETE/PATCH  /api/projetos/[id]/tarefas/[tarefaId]
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

jest.mock('@/domains/projects/services/ProjectTaskService', () => ({
  ProjectTaskService: jest.fn().mockImplementation(() => ({
    listarPorProjeto: mockListarPorProjeto,
    criar: mockCriar,
    buscarPorId: mockBuscarPorId,
    atualizar: mockAtualizar,
    excluir: mockExcluir,
    alterarStatus: mockAlterarStatus,
  })),
}));

jest.mock('@/domains/projects/validators', () => ({
  createProjetoTarefaSchema: { parse: jest.fn((v: unknown) => v) },
  updateProjetoTarefaSchema: { parse: jest.fn((v: unknown) => v) },
  alterarStatusTarefaSchema: { parse: jest.fn((v: unknown) => v) },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import {
  GET as getTarefas,
  POST as postTarefa,
} from '@/app/api/projetos/[id]/tarefas/route';

import {
  GET as getTarefa,
  PUT as putTarefa,
  DELETE as deleteTarefa,
  PATCH as patchTarefa,
} from '@/app/api/projetos/[id]/tarefas/[tarefaId]/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const makeCtxTarefa = (id: string, tarefaId: string) => ({
  params: Promise.resolve({ id, tarefaId }),
});

describe('GET /api/projetos/[id]/tarefas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockListarPorProjeto.mockResolvedValue([{ id: 1, titulo: 'Tarefa 1' }]);
  });

  it('returns 200 with tarefas list', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas');
    const res = await getTarefas(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tarefas).toHaveLength(1);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/tarefas');
    const res = await getTarefas(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas');

    await expect(getTarefas(req, makeCtx('1'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when no permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas');

    await expect(getTarefas(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('POST /api/projetos/[id]/tarefas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockCriar.mockResolvedValue({ id: 1, titulo: 'Nova Tarefa' });
  });

  it('returns 201 with created tarefa', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas', 'POST', {
      titulo: 'Nova Tarefa',
    });
    const res = await postTarefa(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.titulo).toBe('Nova Tarefa');
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/tarefas', 'POST', {
      titulo: 'Tarefa',
    });
    const res = await postTarefa(req, makeCtx('abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas', 'POST', {
      titulo: 'Tarefa',
    });

    await expect(postTarefa(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('GET /api/projetos/[id]/tarefas/[tarefaId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockBuscarPorId.mockResolvedValue({ id: 1, titulo: 'Tarefa A' });
  });

  it('returns 200 with tarefa data', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/1');
    const res = await getTarefa(req, makeCtxTarefa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.titulo).toBe('Tarefa A');
  });

  it('returns 404 when tarefa not found', async () => {
    mockBuscarPorId.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/999');
    const res = await getTarefa(req, makeCtxTarefa('1', '999'));

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid tarefaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/abc');
    const res = await getTarefa(req, makeCtxTarefa('1', 'abc'));

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/projetos/[id]/tarefas/[tarefaId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockAtualizar.mockResolvedValue({ id: 1, titulo: 'Tarefa Atualizada' });
  });

  it('returns 200 with updated tarefa', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/1', 'PUT', {
      titulo: 'Tarefa Atualizada',
    });
    const res = await putTarefa(req, makeCtxTarefa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.titulo).toBe('Tarefa Atualizada');
  });

  it('returns 400 for invalid tarefaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/abc', 'PUT', {});
    const res = await putTarefa(req, makeCtxTarefa('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/1', 'PUT', {});

    await expect(putTarefa(req, makeCtxTarefa('1', '1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('DELETE /api/projetos/[id]/tarefas/[tarefaId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockExcluir.mockResolvedValue(undefined);
  });

  it('returns 200 on successful delete', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/1', 'DELETE');
    const res = await deleteTarefa(req, makeCtxTarefa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain('excluída');
  });

  it('returns 400 for invalid tarefaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/abc', 'DELETE');
    const res = await deleteTarefa(req, makeCtxTarefa('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws FORBIDDEN for unauthorized role', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/1', 'DELETE');

    await expect(deleteTarefa(req, makeCtxTarefa('1', '1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('PATCH /api/projetos/[id]/tarefas/[tarefaId] (status)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockAlterarStatus.mockResolvedValue({ id: 1, status: 'concluida' });
  });

  it('returns 200 with updated status', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/1', 'PATCH', {
      status: 'concluida',
    });
    const res = await patchTarefa(req, makeCtxTarefa('1', '1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('concluida');
  });

  it('returns 400 for invalid tarefaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/abc', 'PATCH', {});
    const res = await patchTarefa(req, makeCtxTarefa('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/tarefas/1', 'PATCH', {
      status: 'concluida',
    });

    await expect(patchTarefa(req, makeCtxTarefa('1', '1'))).rejects.toThrow('UNAUTHENTICATED');
  });
});
