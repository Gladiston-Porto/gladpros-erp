/**
 * @jest-environment node
 *
 * Unit tests for checklist route:
 *   GET  /api/projetos/[id]/etapas/[etapaId]/checklist
 *   PUT  /api/projetos/[id]/etapas/[etapaId]/checklist
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectChildAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectChildAccess: (...args: unknown[]) => mockRequireProjectChildAccess(...args),
}));

const mockProjetoEtapaFindUnique = jest.fn();
const mockProjetoEtapaFindFirst = jest.fn();
const mockProjetoEtapaUpdate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    projetoEtapa: {
      findUnique: (...args: unknown[]) => mockProjetoEtapaFindUnique(...args),
      findFirst: (...args: unknown[]) => mockProjetoEtapaFindFirst(...args),
      update: (...args: unknown[]) => mockProjetoEtapaUpdate(...args),
    },
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import {
  GET,
  PUT,
} from '@/app/api/projetos/[id]/etapas/[etapaId]/checklist/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const makeCtx = (id: string, etapaId: string) => ({
  params: Promise.resolve({ id, etapaId }),
});

const BASE = 'http://localhost:3000/api/projetos/1/etapas/5/checklist';

const sampleItens = [
  { id: 'item-1', texto: 'Verificar instalação elétrica', concluido: false },
  { id: 'item-2', texto: 'Testar disjuntores', concluido: true },
];

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/projetos/[id]/etapas/[etapaId]/checklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockProjetoEtapaFindFirst.mockResolvedValue({ id: 5, checklistItens: sampleItens });
  });

  it('returns 200 with checklist items', async () => {
    const req = makeRequest(BASE);
    const res = await GET(req, makeCtx('1', '5'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].texto).toBe('Verificar instalação elétrica');
  });

  it('returns empty array when checklist has no items', async () => {
    mockProjetoEtapaFindFirst.mockResolvedValue({ id: 5, checklistItens: [] });
    const req = makeRequest(BASE);
    const res = await GET(req, makeCtx('1', '5'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
  });

  it('returns 404 when etapa not found', async () => {
    mockProjetoEtapaFindFirst.mockResolvedValue(null);
    const req = makeRequest(BASE);
    const res = await GET(req, makeCtx('1', '5'));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid etapaId', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/etapas/abc/checklist');
    const res = await GET(req, makeCtx('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest(BASE);

    await expect(GET(req, makeCtx('1', '5'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when insufficient permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest(BASE);

    await expect(GET(req, makeCtx('1', '5'))).rejects.toThrow('FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe('PUT /api/projetos/[id]/etapas/[etapaId]/checklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockProjetoEtapaFindFirst.mockResolvedValue({ id: 5 });
    mockProjetoEtapaUpdate.mockResolvedValue({ id: 5, checklistItens: sampleItens });
  });

  it('returns 200 with saved checklist', async () => {
    const req = makeRequest(BASE, 'PUT', { itens: sampleItens });
    const res = await PUT(req, makeCtx('1', '5'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(mockProjetoEtapaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: { checklistItens: sampleItens } }),
    );
  });

  it('returns 200 with empty checklist (all items removed)', async () => {
    mockProjetoEtapaUpdate.mockResolvedValue({ id: 5, checklistItens: [] });
    const req = makeRequest(BASE, 'PUT', { itens: [] });
    const res = await PUT(req, makeCtx('1', '5'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
  });

  it('returns 400 for invalid etapaId', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/etapas/abc/checklist',
      'PUT',
      { itens: [] },
    );
    const res = await PUT(req, makeCtx('1', 'abc'));

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid body (missing itens)', async () => {
    const req = makeRequest(BASE, 'PUT', { wrong: 'field' });
    const res = await PUT(req, makeCtx('1', '5'));

    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
  });

  it('returns 400 for item missing required fields', async () => {
    const req = makeRequest(BASE, 'PUT', {
      itens: [{ id: 'x' }], // missing texto + concluido
    });
    const res = await PUT(req, makeCtx('1', '5'));

    expect(res.status).toBe(400);
  });

  it('returns 404 when etapa not found', async () => {
    mockProjetoEtapaFindFirst.mockResolvedValue(null);

    const req = makeRequest(BASE, 'PUT', { itens: sampleItens });
    const res = await PUT(req, makeCtx('1', '5'));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('throws FORBIDDEN when insufficient permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest(BASE, 'PUT', { itens: [] });

    await expect(PUT(req, makeCtx('1', '5'))).rejects.toThrow('FORBIDDEN');
  });
});
