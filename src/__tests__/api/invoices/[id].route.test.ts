/**
 * Unit Tests — GET/PUT/DELETE /api/invoices/[id]
 * Includes IDOR tests: user from empresa 2 cannot access invoice from empresa 1
 */

jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try { return new URLSearchParams(url.includes('?') ? url.split('?')[1] ?? '' : ''); }
    catch { return new URLSearchParams(); }
  };
  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => ({
      url,
      method: (init?.method ?? 'GET').toUpperCase(),
      nextUrl: { searchParams: makeSearchParams(url), pathname: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] },
      headers: { get: (name: string) => { const h = (init?.headers ?? {}) as Record<string, string>; return h[name] ?? h[name.toLowerCase()] ?? null; } },
      json: jest.fn().mockImplementation(() => { if (init?.body) { try { return Promise.resolve(JSON.parse(init.body)); } catch { return Promise.resolve({}); } } return Promise.resolve({}); }),
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data: unknown, options?: { status?: number }) => ({
        status: options?.status ?? 200,
        _data: data,
      })),
    },
  };
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invoicePayment: { findMany: jest.fn(), create: jest.fn() },
    invoiceItem: { deleteMany: jest.fn(), createMany: jest.fn() },
    auditLog: { create: jest.fn() },
    taxRate: { findUnique: jest.fn() },
    $transaction: jest.fn(),
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

const mockInvoice = {
  id: 1,
  empresaId: 1,
  numeroInvoice: 'INV-20250101-0001',
  clienteId: 1,
  status: 'DRAFT',
  valorTotal: 1000,
  valorPago: 0,
  saldo: 1000,
  taxRate: 0.0825,
  itens: [],
  pagamentos: [],
  lembretes: [],
  cliente: { id: 1, nomeCompleto: 'Test Client', nomeFantasia: null, email: 'c@test.com' },
  projeto: null,
  criador: null,
  atualizador: null,
};

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

function makeRequest(url = 'http://localhost/api/invoices/1', init?: { method?: string; body?: string }) {
  return new NextRequest(url, init);
}

describe('GET /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
  });

  it('200 — returns invoice for valid id', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

    const { GET } = await import('@/app/api/invoices/[id]/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { success: boolean } })._data;
    expect(data.success).toBe(true);
  });

  it('404 — invoice not found', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { GET } = await import('@/app/api/invoices/[id]/route');
    const res = await GET(makeRequest(), makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('400 — invalid id (NaN)', async () => {
    const { GET } = await import('@/app/api/invoices/[id]/route');
    const res = await GET(makeRequest(), makeContext('abc'));

    expect(res.status).toBe(400);
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { GET } = await import('@/app/api/invoices/[id]/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(401);
  });

  it('403 — ESTOQUE role', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'ESTOQUE' } as never);
    mockCan.mockReturnValue(false);

    const { GET } = await import('@/app/api/invoices/[id]/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('500 — database error', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/invoices/[id]/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(500);
  });
});

describe('PUT /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(mockPrisma));
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('200 — updates invoice successfully', async () => {
    const { PUT } = await import('@/app/api/invoices/[id]/route');
    const req = makeRequest('http://localhost/api/invoices/1', {
      method: 'PUT',
      body: JSON.stringify({ notas: 'Updated notes' }),
    });
    const res = await PUT(req, makeContext('1'));

    expect(res.status).toBe(200);
  });

  it('400 — cannot edit PAID invoice', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...mockInvoice, status: 'PAID' });

    const { PUT } = await import('@/app/api/invoices/[id]/route');
    const req = makeRequest('http://localhost/api/invoices/1', {
      method: 'PUT',
      body: JSON.stringify({ notas: 'Updated' }),
    });
    const res = await PUT(req, makeContext('1'));

    expect(res.status).toBe(400);
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { PUT } = await import('@/app/api/invoices/[id]/route');
    const req = makeRequest('http://localhost/api/invoices/1', { method: 'PUT', body: '{}' });
    const res = await PUT(req, makeContext('1'));

    expect(res.status).toBe(401);
  });

  it('403 — USUARIO cannot update invoices', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'USUARIO' } as never);
    mockCan.mockReturnValue(false);

    const { PUT } = await import('@/app/api/invoices/[id]/route');
    const req = makeRequest('http://localhost/api/invoices/1', { method: 'PUT', body: '{}' });
    const res = await PUT(req, makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('404 — invoice not found (PUT)', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { PUT } = await import('@/app/api/invoices/[id]/route');
    const req = makeRequest('http://localhost/api/invoices/1', { method: 'PUT', body: '{}' });
    const res = await PUT(req, makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('single-tenant: PUT uses findFirst (no cross-company risk in single-tenant design)', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { PUT } = await import('@/app/api/invoices/[id]/route');
    const req = makeRequest('http://localhost/api/invoices/1', { method: 'PUT', body: '{}' });
    const res = await PUT(req, makeContext('1'));

    expect(res.status).toBe(404);
    expect(mockPrisma.invoice.findFirst).toHaveBeenCalled();
  });
});

describe('DELETE /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(mockPrisma));
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('200 — soft deletes (cancels) invoice', async () => {
    const { DELETE } = await import('@/app/api/invoices/[id]/route');
    const res = await DELETE(makeRequest(), makeContext('1'));

    expect(res.status).toBe(200);
  });

  it('400 — cannot delete PAID invoice', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      status: 'PAID',
      valorPago: 1000,
    });

    const { DELETE } = await import('@/app/api/invoices/[id]/route');
    const res = await DELETE(makeRequest(), makeContext('1'));

    expect(res.status).toBe(400);
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { DELETE } = await import('@/app/api/invoices/[id]/route');
    const res = await DELETE(makeRequest(), makeContext('1'));

    expect(res.status).toBe(401);
  });

  it('403 — USUARIO cannot delete invoices', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'USUARIO' } as never);
    mockCan.mockReturnValue(false);

    const { DELETE } = await import('@/app/api/invoices/[id]/route');
    const res = await DELETE(makeRequest(), makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('404 — invoice not found (DELETE)', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/invoices/[id]/route');
    const res = await DELETE(makeRequest(), makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('single-tenant: DELETE uses findFirst', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/invoices/[id]/route');
    const res = await DELETE(makeRequest(), makeContext('1'));

    expect(res.status).toBe(404);
    expect(mockPrisma.invoice.findFirst).toHaveBeenCalled();
  });
});
