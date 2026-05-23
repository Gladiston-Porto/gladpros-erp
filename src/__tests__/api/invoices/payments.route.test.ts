/**
 * Unit Tests — GET/POST /api/invoices/[id]/payments
 */

jest.mock('next/server', () => {
  const makeSearchParams = (url: string) => {
    try {
      return new URLSearchParams(url.includes('?') ? (url.split('?')[1] ?? '') : '');
    } catch {
      return new URLSearchParams();
    }
  };
  return {
    NextRequest: jest
      .fn()
      .mockImplementation((url: string, init?: { method?: string; body?: string }) => ({
        url,
        method: (init?.method ?? 'GET').toUpperCase(),
        nextUrl: { searchParams: makeSearchParams(url) },
        headers: { get: () => null },
        json: jest.fn().mockImplementation(() => {
          if (init?.body) {
            try {
              return Promise.resolve(JSON.parse(init.body));
            } catch {
              return Promise.resolve({});
            }
          }
          return Promise.resolve({});
        }),
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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    invoicePayment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bankAccount: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    bankTransaction: { create: jest.fn() },
    ledgerTransaction: { findUnique: jest.fn(), create: jest.fn() },
    revenueCategory: { findFirst: jest.fn(), create: jest.fn() },
    revenue: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/api/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

jest.mock('@/lib/api/error-handler', () => ({
  withErrorHandler: jest
    .fn()
    .mockImplementation((handler: Function) => async (...args: unknown[]) => {
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
  status: 'SENT',
  valorTotal: 1000,
  valorPago: 0,
  saldo: 1000,
  clienteId: 5,
};

const mockPayment = {
  id: 1,
  invoiceId: 1,
  valor: 500,
  dataPagamento: new Date(),
  metodoPagamento: 'BANK_TRANSFER',
  criador: { id: 1, nomeCompleto: 'Admin', email: 'admin@test.com' },
};

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

function makeRequest(
  url = 'http://localhost/api/invoices/1/payments',
  init?: { method?: string; body?: string },
) {
  return new NextRequest(url, init);
}

describe('GET /api/invoices/[id]/payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
  });

  it('200 — returns payments list', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    (mockPrisma.invoicePayment.findMany as jest.Mock).mockResolvedValue([mockPayment]);

    const { GET } = await import('@/app/api/invoices/[id]/payments/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { data: unknown[]; success: boolean } })._data;
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('404 — invoice not found', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { GET } = await import('@/app/api/invoices/[id]/payments/route');
    const res = await GET(makeRequest(), makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { GET } = await import('@/app/api/invoices/[id]/payments/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(401);
  });

  it('403 — ESTOQUE has no access', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'ESTOQUE' } as never);
    mockCan.mockReturnValue(false);

    const { GET } = await import('@/app/api/invoices/[id]/payments/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('single-tenant: findFirst used for invoice lookup', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { GET } = await import('@/app/api/invoices/[id]/payments/route');
    const res = await GET(makeRequest(), makeContext('1'));

    expect(res.status).toBe(404);
    expect(mockPrisma.invoice.findFirst).toHaveBeenCalled();
  });
});

describe('POST /api/invoices/[id]/payments', () => {
  const validBody = {
    valor: 500,
    dataPagamento: new Date().toISOString(),
    metodoPagamento: 'BANK_TRANSFER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) =>
      fn(mockPrisma),
    );
    (mockPrisma.invoicePayment.create as jest.Mock).mockResolvedValue(mockPayment);
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('201 — creates payment successfully', async () => {
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
      payment: mockPayment,
      invoice: { ...mockInvoice, status: 'PARTIAL_PAID' },
    });

    const { POST } = await import('@/app/api/invoices/[id]/payments/route');
    const req = makeRequest('http://localhost/api/invoices/1/payments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, makeContext('1'));

    expect(res.status).toBe(201);
  });

  it('400 — payment exceeds invoice balance', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...mockInvoice, saldo: 100 });

    const { POST } = await import('@/app/api/invoices/[id]/payments/route');
    const req = makeRequest('http://localhost/api/invoices/1/payments', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, valor: 999 }),
    });
    const res = await POST(req, makeContext('1'));

    expect(res.status).toBe(400);
  });

  it('400 — invoice already PAID', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      status: 'PAID',
    });

    const { POST } = await import('@/app/api/invoices/[id]/payments/route');
    const req = makeRequest('http://localhost/api/invoices/1/payments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, makeContext('1'));

    expect(res.status).toBe(400);
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { POST } = await import('@/app/api/invoices/[id]/payments/route');
    const req = makeRequest('http://localhost/api/invoices/1/payments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, makeContext('1'));

    expect(res.status).toBe(401);
  });

  it('403 — USUARIO cannot register payments', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'USUARIO' } as never);
    mockCan.mockReturnValue(false);

    const { POST } = await import('@/app/api/invoices/[id]/payments/route');
    const req = makeRequest('http://localhost/api/invoices/1/payments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('404 — invoice not found', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { POST } = await import('@/app/api/invoices/[id]/payments/route');
    const req = makeRequest('http://localhost/api/invoices/1/payments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, makeContext('999'));

    expect(res.status).toBe(404);
  });

  it('500 — transaction error', async () => {
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

    const { POST } = await import('@/app/api/invoices/[id]/payments/route');
    const req = makeRequest('http://localhost/api/invoices/1/payments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, makeContext('1'));

    expect(res.status).toBe(500);
  });

  describe('Invoice→Revenue integration', () => {
    const fullPaymentBody = {
      valor: 1000,
      dataPagamento: new Date().toISOString(),
      metodoPagamento: 'BANK_TRANSFER',
    };

    function makeTxMock(overrides: Record<string, jest.Mock> = {}) {
      const tx = {
        invoicePayment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 10, invoiceId: 1, valor: 1000 }),
          update: jest.fn().mockResolvedValue({}),
        },
        invoice: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(mockInvoice)
            .mockResolvedValueOnce({ ...mockInvoice, valorPago: 1000, saldo: 0 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          update: jest.fn().mockResolvedValue({
            id: 1,
            status: 'PAID',
            valorPago: 1000,
            saldo: 0,
            valorTotal: 1000,
          }),
        },
        bankAccount: {
          update: jest.fn().mockResolvedValue({ saldoAtual: 1000 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        bankTransaction: { create: jest.fn().mockResolvedValue({}) },
        ledgerTransaction: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest
            .fn()
            .mockResolvedValueOnce({ id: 201, entries: [] })
            .mockResolvedValueOnce({ id: 202, entries: [] }),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        revenueCategory: { findFirst: jest.fn(), create: jest.fn() },
        revenue: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 99 }),
        },
        ...overrides,
      };
      (mockPrisma.$transaction as jest.Mock).mockImplementation((cb: (tx: typeof tx) => unknown) =>
        cb(tx),
      );
      return tx;
    }

    beforeEach(() => {
      jest.clearAllMocks();
      mockRequireUser.mockResolvedValue(mockUser as never);
      mockCan.mockReturnValue(true);
      (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        saldo: 1000,
        valorPago: 0,
      });
    });

    it('201 — Revenue is created for the received payment amount when category exists', async () => {
      const tx = makeTxMock();
      (tx.revenueCategory.findFirst as jest.Mock).mockResolvedValue({ id: 7 });

      const { POST } = await import('@/app/api/invoices/[id]/payments/route');
      const req = makeRequest('http://localhost/api/invoices/1/payments', {
        method: 'POST',
        body: JSON.stringify(fullPaymentBody),
      });
      const res = await POST(req, makeContext('1'));

      expect(res.status).toBe(201);
      expect(tx.revenue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId: 1,
            categoriaId: 7,
            valor: expect.anything(),
            descricao: 'Invoice #1 - pagamento recebido',
            status: 'RECEBIDA',
          }),
        }),
      );
    });

    it('201 — Revenue is created with auto-created category when none exists', async () => {
      const tx = makeTxMock();
      (tx.revenueCategory.findFirst as jest.Mock).mockResolvedValue(null);
      (tx.revenueCategory.create as jest.Mock).mockResolvedValue({ id: 42 });

      const { POST } = await import('@/app/api/invoices/[id]/payments/route');
      const req = makeRequest('http://localhost/api/invoices/1/payments', {
        method: 'POST',
        body: JSON.stringify(fullPaymentBody),
      });
      const res = await POST(req, makeContext('1'));

      expect(res.status).toBe(201);
      expect(tx.revenueCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId: 1,
            nome: 'Pagamentos de Invoice',
          }),
        }),
      );
      expect(tx.revenue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ categoriaId: 42 }),
        }),
      );
    });

    it('500 — payment rolls back if Revenue creation fails', async () => {
      const tx = makeTxMock();
      (tx.revenueCategory.findFirst as jest.Mock).mockResolvedValue({ id: 7 });
      (tx.revenue.create as jest.Mock).mockRejectedValue(new Error('Decimal overflow'));

      const { POST } = await import('@/app/api/invoices/[id]/payments/route');
      const req = makeRequest('http://localhost/api/invoices/1/payments', {
        method: 'POST',
        body: JSON.stringify(fullPaymentBody),
      });
      const res = await POST(req, makeContext('1'));

      expect(res.status).toBe(500);
    });

    it('Revenue is NOT created for partial payment (PARTIAL_PAID)', async () => {
      const partialBody = { ...fullPaymentBody, valor: 400 };
      const tx = makeTxMock();
      (tx.invoice.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'PARTIAL_PAID',
        valorPago: 400,
        saldo: 600,
        valorTotal: 1000,
      });
      (tx.invoicePayment.create as jest.Mock).mockResolvedValue({
        id: 11,
        invoiceId: 1,
        valor: 400,
      });

      const { POST } = await import('@/app/api/invoices/[id]/payments/route');
      const req = makeRequest('http://localhost/api/invoices/1/payments', {
        method: 'POST',
        body: JSON.stringify(partialBody),
      });
      const res = await POST(req, makeContext('1'));

      expect(res.status).toBe(201);
      // Revenue is only created when invoice becomes fully PAID, not for partial payments
      expect(tx.revenue.create).not.toHaveBeenCalled();
    });
  });
});
