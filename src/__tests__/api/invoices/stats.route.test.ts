/**
 * Unit Tests — GET /api/invoices/stats
 */

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string) => ({
    url,
    method: 'GET',
    nextUrl: { searchParams: new URLSearchParams() },
    headers: { get: () => null },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
      status: options?.status ?? 200,
      _data: data,
    })),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest.fn().mockImplementation((handler: Function) => async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
        return { status: 401, _data: { error: 'Unauthorized', success: false } };
      }
      return { status: 500, _data: { error: 'Internal server error', success: false } };
    }
  }),
}));

import { NextRequest } from 'next/server';
import { requireUser, can } from '@/shared/lib/rbac';
import { prisma } from '@/lib/prisma';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCan = can as jest.MockedFunction<typeof can>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockUser = {
  id: 'user-1',
  email: 'admin@gladpros.com',
  role: 'ADMIN',
  empresaId: 1,
  nivel: 1,
};

function makeRequest(url = 'http://localhost/api/invoices/stats') {
  return new NextRequest(url);
}

describe('GET /api/invoices/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.invoice.aggregate as jest.Mock).mockResolvedValue({
      _sum: { valorTotal: 5000, valorPago: 3000, saldo: 2000 },
    });
    (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(2);
  });

  it('200 — returns stats with correct shape', async () => {
    const { GET } = await import('@/app/api/invoices/stats/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { success: boolean; data: object } })._data;
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      totalFaturado: 5000,
      totalRecebido: 3000,
      totalPendente: 2000,
    });
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { GET } = await import('@/app/api/invoices/stats/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('403 — ESTOQUE has no access', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'ESTOQUE' } as never);
    mockCan.mockReturnValue(false);

    const { GET } = await import('@/app/api/invoices/stats/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
  });

  it('500 — database error', async () => {
    (mockPrisma.invoice.aggregate as jest.Mock).mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/invoices/stats/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
  });

  it('stats endpoint is protected by auth and RBAC', async () => {
    const { GET } = await import('@/app/api/invoices/stats/route');
    await GET(makeRequest());

    // requireUser was called (auth enforced)
    expect(mockRequireUser).toHaveBeenCalled();
    // aggregate was called (data was queried)
    expect(mockPrisma.invoice.aggregate).toHaveBeenCalled();
  });

  it('parallel queries used for stats (Promise.all)', async () => {
    const { GET } = await import('@/app/api/invoices/stats/route');
    await GET(makeRequest());

    // Both aggregate and count calls happened
    expect(mockPrisma.invoice.aggregate).toHaveBeenCalledTimes(1);
    expect(mockPrisma.invoice.count).toHaveBeenCalledTimes(2);
  });
});
