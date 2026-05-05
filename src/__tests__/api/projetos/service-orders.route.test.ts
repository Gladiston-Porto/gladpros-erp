/**
 * @jest-environment node
 *
 * Unit tests for service-orders route:
 *   GET /api/projetos/[id]/service-orders
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
}));

const mockProjetoFindUnique = jest.fn();
const mockServiceOrderFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: {
      findUnique: (...args: unknown[]) => mockProjetoFindUnique(...args),
    },
    serviceOrder: {
      findMany: (...args: unknown[]) => mockServiceOrderFindMany(...args),
    },
  },
}));

jest.mock('@/shared/lib/rate-limit', () => ({
  apiRateLimit: {
    isAllowed: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
    }),
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { GET } from '@/app/api/projetos/[id]/service-orders/route';

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method: 'GET' });
}

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

const BASE = 'http://localhost:3000/api/projetos/1/service-orders';

const sampleServiceOrders = [
  { id: 10, title: 'OS Elétrica', status: 'ABERTA' },
  { id: 11, title: 'OS Hidráulica', status: 'CONCLUIDA' },
];

describe('GET /api/projetos/[id]/service-orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockProjetoFindUnique.mockResolvedValue({ id: 1 });
    mockServiceOrderFindMany.mockResolvedValue(sampleServiceOrders);
  });

  it('returns 200 with service orders list', async () => {
    const req = makeRequest(BASE);
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].title).toBe('OS Elétrica');
  });

  it('returns 200 with empty list when no service orders', async () => {
    mockServiceOrderFindMany.mockResolvedValue([]);
    const req = makeRequest(BASE);
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
  });

  it('returns 400 for invalid project ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/service-orders');
    const res = await GET(req, makeCtx('abc'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('returns 404 when project not found', async () => {
    mockProjetoFindUnique.mockResolvedValue(null);

    const req = makeRequest(BASE);
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const { apiRateLimit } = jest.requireMock('@/shared/lib/rate-limit');
    apiRateLimit.isAllowed.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 30000,
    });

    const req = makeRequest(BASE);
    const res = await GET(req, makeCtx('1'));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.success).toBe(false);
  });

  it('throws UNAUTHENTICATED when no auth', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('UNAUTHENTICATED'));
    const req = makeRequest(BASE);

    await expect(GET(req, makeCtx('1'))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN when insufficient permission', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest(BASE);

    await expect(GET(req, makeCtx('1'))).rejects.toThrow('FORBIDDEN');
  });
});