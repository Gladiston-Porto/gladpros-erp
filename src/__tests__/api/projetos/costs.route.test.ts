/**
 * @jest-environment node
 *
 * Unit tests for GET/POST /api/projetos/[id]/financeiro/costs
 */

import { NextRequest } from 'next/server';

const mockRequireProjectPermission = jest.fn();
const mockRequireProjectAccess = jest.fn();

jest.mock('@/shared/lib/rbac-projects', () => ({
  requireProjectPermission: (...args: unknown[]) => mockRequireProjectPermission(...args),
  requireProjectAccess: (...args: unknown[]) => mockRequireProjectAccess(...args),
}));

const mockGetProjectFinanceSummary = jest.fn();
const mockSyncProjectCosts = jest.fn();

jest.mock('@/shared/lib/services/project-finance', () => ({
  getProjectFinanceSummary: (...args: unknown[]) => mockGetProjectFinanceSummary(...args),
  syncProjectCosts: (...args: unknown[]) => mockSyncProjectCosts(...args),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    projeto: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: (fn: Function) => fn,
}));

import { GET, POST } from '@/app/api/projetos/[id]/financeiro/costs/route';
import { prisma } from '@/lib/prisma';

const mockFindUnique = prisma.projeto.findUnique as jest.Mock;

function makeRequest(url: string, method = 'GET'): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method });
}

const adminUser = { id: '1', role: 'ADMIN', email: 'admin@test.com' };
const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/projetos/[id]/financeiro/costs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({ id: 1 });
    mockGetProjectFinanceSummary.mockResolvedValue({
      totalExpenses: 5000,
      totalTimesheets: 2000,
    });
  });

  it('returns 200 with finance summary', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/costs');
    const res = await GET(req, makeContext('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.totalExpenses).toBe(5000);
  });

  it('returns 400 for invalid ID', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/abc/financeiro/costs');
    const res = await GET(req, makeContext('abc'));

    expect(res.status).toBe(400);
  });

  it('returns 404 when project not found', async () => {
    mockGetProjectFinanceSummary.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/999/financeiro/costs');
    const res = await GET(req, makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('throws FORBIDDEN for non-financial roles', async () => {
    mockRequireProjectPermission.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/costs');

    await expect(GET(req, makeContext('1'))).rejects.toThrow('FORBIDDEN');
  });
});

describe('POST /api/projetos/[id]/financeiro/costs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireProjectPermission.mockResolvedValue(adminUser);
    mockFindUnique.mockResolvedValue({ id: 1 });
    mockSyncProjectCosts.mockResolvedValue({
      totalExpenses: 5000,
      synced: true,
    });
  });

  it('returns 200 after syncing costs', async () => {
    const req = makeRequest('http://localhost:3000/api/projetos/1/financeiro/costs', 'POST');
    const res = await POST(req, makeContext('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('recalculados');
  });

  it('returns 404 for non-existent project', async () => {
    mockSyncProjectCosts.mockResolvedValue(null);
    const req = makeRequest('http://localhost:3000/api/projetos/999/financeiro/costs', 'POST');
    const res = await POST(req, makeContext('999'));

    expect(res.status).toBe(404);
  });
});
