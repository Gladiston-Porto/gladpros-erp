/**
 * @jest-environment node
 *
 * Unit tests for Change Orders routes:
 *   GET  /api/projetos/[id]/change-orders
 *   POST /api/projetos/[id]/change-orders
 *   PATCH /api/projetos/[id]/change-orders/[coId]/decision
 */

import { NextRequest } from 'next/server';

// ─── mocks ────────────────────────────────────────────────────────────────────

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: { findUnique: jest.fn() },
    changeOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { prisma } from '@/lib/prisma';
import { GET as listCO, POST as createCO } from '@/app/api/projetos/[id]/change-orders/route';
import { PATCH as decideCO } from '@/app/api/projetos/[id]/change-orders/[coId]/decision/route';

// typed mock aliases
const mockFindMany = prisma.changeOrder.findMany as jest.Mock;
const mockCount = prisma.changeOrder.count as jest.Mock;
const mockFindFirst = prisma.changeOrder.findFirst as jest.Mock;
const mockCreate = prisma.changeOrder.create as jest.Mock;
const mockUpdate = prisma.changeOrder.update as jest.Mock;
const mockProjetoFindUnique = prisma.projeto.findUnique as jest.Mock;

// ─── helpers ──────────────────────────────────────────────────────────────────

const adminUser = { id: 1, role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

const makeListCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const makeDecideCtx = (id: string, coId: string) => ({ params: Promise.resolve({ id, coId }) });

const baseCO = {
  id: 10,
  projectId: 1,
  jobType: 'PROJECT',
  type: 'UNFORESEEN',
  status: 'DRAFT',
  description: 'Circuito extra necessário',
  rootCause: null,
  priceDelta: 2500,
  costDelta: 1800,
  taxDelta: 0,
  createdById: adminUser.id,
  approvedAt: null,
  approvedBy: null,
  approvedByName: null,
  rejectedAt: null,
  rejectedBy: null,
  rejectedByName: null,
  rejectedReason: null,
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── GET /change-orders ───────────────────────────────────────────────────────

describe('GET /api/projetos/[id]/change-orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockRequireProjectAccess.mockResolvedValue(undefined);
    mockFindMany.mockResolvedValue([baseCO]);
    mockCount.mockResolvedValue(1);
  });

  it('returns 200 with paginated list', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders');
    const res = await listCO(req, makeListCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/change-orders');
    const res = await listCO(req, makeListCtx('abc'));
    expect(res.status).toBe(400);
  });

  it('filters by status when provided', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders?status=APPROVED');
    await listCO(req, makeListCtx('1'));

    const findCall = mockFindMany.mock.calls[0][0];
    expect(findCall.where.status).toBe('APPROVED');
  });

  it('returns 403 when requireProjectAccess throws', async () => {
    mockRequireProjectAccess.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders');
    await expect(listCO(req, makeListCtx('1'))).rejects.toMatchObject({ status: 403 });
  });
});

// ─── POST /change-orders ─────────────────────────────────────────────────────

describe('POST /api/projetos/[id]/change-orders', () => {
  const validBody = {
    type: 'UNFORESEEN',
    description: 'Circuito extra necessário na cozinha para atender código elétrico',
    priceDelta: 2500,
    costDelta: 1800,
    taxDelta: 0,
    items: [{ type: 'LABOR', description: 'Circuito 20A', qty: 1, unitPrice: 2500, unitCost: 1800, lineTotal: 2500 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockRequireProjectAccess.mockResolvedValue(undefined);
    mockProjetoFindUnique.mockResolvedValue({ id: 1, status: 'em_execucao' });
    mockCreate.mockResolvedValue({ ...baseCO, ...validBody });
  });

  it('creates change order and returns 201', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders', 'POST', validBody);
    const res = await createCO(req, makeListCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.type).toBe(validBody.type);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/change-orders', 'POST', validBody);
    const res = await createCO(req, makeListCtx('abc'));
    expect(res.status).toBe(400);
  });

  it('blocks creation on concluded project (422)', async () => {
    mockProjetoFindUnique.mockResolvedValue({ id: 1, status: 'concluido' });
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders', 'POST', validBody);
    const res = await createCO(req, makeListCtx('1'));
    expect(res.status).toBe(422);
  });

  it('blocks creation on archived project (422)', async () => {
    mockProjetoFindUnique.mockResolvedValue({ id: 1, status: 'arquivado' });
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders', 'POST', validBody);
    const res = await createCO(req, makeListCtx('1'));
    expect(res.status).toBe(422);
  });

  it('returns 404 when project not found', async () => {
    mockProjetoFindUnique.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders', 'POST', validBody);
    const res = await createCO(req, makeListCtx('1'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for short description', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/change-orders', 'POST', {
      ...validBody,
      description: 'curto',
    });
    const res = await createCO(req, makeListCtx('1'));
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /change-orders/[coId]/decision ─────────────────────────────────────

describe('PATCH /api/projetos/[id]/change-orders/[coId]/decision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockRequireProjectAccess.mockResolvedValue(undefined);
    mockFindFirst.mockResolvedValue(baseCO);
    mockUpdate.mockResolvedValue({ ...baseCO, status: 'APPROVED', approvedBy: adminUser.id, approvedByName: adminUser.email });
  });

  it('approves a DRAFT change order', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/change-orders/10/decision',
      'PATCH',
      { action: 'approve' },
    );
    const res = await decideCO(req, makeDecideCtx('1', '10'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('APPROVED');
  });

  it('rejects a SENT change order with reason', async () => {
    mockFindFirst.mockResolvedValue({ ...baseCO, status: 'SENT' });
    mockUpdate.mockResolvedValue({ ...baseCO, status: 'REJECTED', rejectedReason: 'Fora do escopo' });
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/change-orders/10/decision',
      'PATCH',
      { action: 'reject', reason: 'Fora do escopo' },
    );
    const res = await decideCO(req, makeDecideCtx('1', '10'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('REJECTED');
  });

  it('returns 400 when reject has no reason', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/change-orders/10/decision',
      'PATCH',
      { action: 'reject' },
    );
    const res = await decideCO(req, makeDecideCtx('1', '10'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when change order not found', async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/change-orders/99/decision',
      'PATCH',
      { action: 'approve' },
    );
    const res = await decideCO(req, makeDecideCtx('1', '99'));
    expect(res.status).toBe(404);
  });

  it('returns 422 when CO is already APPROVED (not DRAFT/SENT)', async () => {
    mockFindFirst.mockResolvedValue({ ...baseCO, status: 'APPROVED' });
    const req = makeRequest(
      'http://localhost:3000/api/projetos/1/change-orders/10/decision',
      'PATCH',
      { action: 'approve' },
    );
    const res = await decideCO(req, makeDecideCtx('1', '10'));
    expect(res.status).toBe(422);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/projetos/abc/change-orders/10/decision',
      'PATCH',
      { action: 'approve' },
    );
    const res = await decideCO(req, makeDecideCtx('abc', '10'));
    expect(res.status).toBe(400);
  });
});


// ─── mocks ────────────────────────────────────────────────────────────────────

