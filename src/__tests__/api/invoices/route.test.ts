/**
 * Unit Tests — GET /api/invoices & POST /api/invoices
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
        headers: new Map(),
        json: jest.fn().mockResolvedValue(data),
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
      aggregate: jest.fn(),
    },
    invoicePayment: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
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
  numeroInvoice: 'INV-20250101-0001',
  empresaId: 1,
  clienteId: 1,
  projetoId: null,
  status: 'DRAFT',
  valorTotal: 1000,
  valorPago: 0,
  saldo: 1000,
  criadoEm: new Date(),
  cliente: { nomeCompleto: 'Test Client', nomeFantasia: null, email: 'client@test.com' },
  projeto: null,
  itens: [],
  _count: { pagamentos: 0 },
};

function makeRequest(url = 'http://localhost/api/invoices', init?: { method?: string; body?: string }) {
  return new NextRequest(url, init);
}

describe('GET /api/invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
  });

  it('200 — returns paginated invoice list', async () => {
    (mockPrisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);
    (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(1);

    const { GET } = await import('@/app/api/invoices/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { data: unknown[]; success: boolean; pagination: object } })._data;
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeDefined();
  });

  it('401 — unauthenticated throws UNAUTHENTICATED', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { GET } = await import('@/app/api/invoices/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('403 — ESTOQUE role gets forbidden', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'ESTOQUE' } as never);
    mockCan.mockReturnValue(false);

    const { GET } = await import('@/app/api/invoices/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
  });

  it('400 — invalid filter params returns validation error', async () => {
    const { GET } = await import('@/app/api/invoices/route');
    const res = await GET(makeRequest('http://localhost/api/invoices?status=INVALID_STATUS'));

    expect(res.status).toBe(400);
  });

  it('500 — prisma error returns 500', async () => {
    (mockPrisma.invoice.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/invoices/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
  });
});

describe('POST /api/invoices', () => {
  const validBody = {
    clienteId: 1,
    dataVencimento: new Date(Date.now() + 86400000).toISOString(),
    itens: [{
      tipo: 'SERVICE',
      descricao: 'Electrical work',
      quantidade: 2,
      unidade: 'HR',
      precoUnitario: 150,
      desconto: 0,
      taxavel: true,
      ordem: 0,
    }],
    descontoValor: 0,
    descontoPercentual: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(mockPrisma));
    (mockPrisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.taxRate.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('201 — creates invoice successfully', async () => {
    const { POST } = await import('@/app/api/invoices/route');
    const req = makeRequest('http://localhost/api/invoices', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = (res as unknown as { _data: { success: boolean } })._data;
    expect(data.success).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { POST } = await import('@/app/api/invoices/route');
    const req = makeRequest('http://localhost/api/invoices', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('403 — USUARIO cannot create invoices', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'USUARIO' } as never);
    mockCan.mockReturnValue(false);

    const { POST } = await import('@/app/api/invoices/route');
    const req = makeRequest('http://localhost/api/invoices', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('400 — missing required fields', async () => {
    const { POST } = await import('@/app/api/invoices/route');
    const req = makeRequest('http://localhost/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ clienteId: 1 }), // missing required itens
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('500 — prisma transaction error', async () => {
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

    const { POST } = await import('@/app/api/invoices/route');
    const req = makeRequest('http://localhost/api/invoices', { method: 'POST', body: JSON.stringify(validBody) });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
