/**
 * Unit Tests — POST /api/invoices/[id]/send
 */

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string }) => ({
    url,
    method: (init?.method ?? 'POST').toUpperCase(),
    nextUrl: { pathname: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] },
    headers: { get: () => null },
    json: jest.fn().mockResolvedValue({}),
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
    invoice: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    invoiceReminder: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/shared/lib/rbac', () => ({
  requireUser: jest.fn(),
  can: jest.fn(),
}));

jest.mock('@/shared/lib/services/invoice-pdf', () => ({
  generateInvoicePDF: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
  }),
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
import { emailRateLimitMap } from '@/app/api/invoices/[id]/send/route';

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
  status: 'DRAFT',
  dataEmissao: new Date(),
  dataVencimento: new Date(Date.now() + 86400000),
  subtotal: 1000,
  descontoValor: 0,
  taxRate: 0.0825,
  taxAmount: 82.5,
  valorTotal: 1082.5,
  valorPago: 0,
  saldo: 1082.5,
  notas: null,
  termos: null,
  cliente: {
    nomeCompleto: 'Test Client',
    nomeFantasia: null,
    nomeChave: null,
    email: 'client@test.com',
    telefone: null,
    addressStreet: '123 Main St',
    addressCity: 'Dallas',
    addressState: 'TX',
    addressZip: '75201',
  },
  projeto: null,
  itens: [],
  pagamentos: [],
};

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

function makeRequest(url = 'http://localhost/api/invoices/1/send') {
  return new NextRequest(url, { method: 'POST' });
}

describe('POST /api/invoices/[id]/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    emailRateLimitMap.clear(); // reset rate limiter between tests
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(mockPrisma));
    (mockPrisma.invoice.update as jest.Mock).mockResolvedValue({ ...mockInvoice, status: 'SENT' });
    (mockPrisma.invoiceReminder as jest.Mocked<typeof mockPrisma.invoiceReminder>).create = jest.fn().mockResolvedValue({});
  });

  it('200 — sends invoice email successfully', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { success: boolean; data: { sentTo: string } } })._data;
    expect(data.success).toBe(true);
    expect(data.data.sentTo).toBe('client@test.com');
  });

  it('401 — unauthenticated', async () => {
    mockRequireUser.mockRejectedValue(new Error('UNAUTHENTICATED'));

    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    expect(res.status).toBe(401);
  });

  it('403 — USUARIO role gets forbidden', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'USUARIO' } as never);
    mockCan.mockReturnValue(false);

    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('403 — ESTOQUE role gets forbidden', async () => {
    mockRequireUser.mockResolvedValue({ ...mockUser, role: 'ESTOQUE' } as never);
    mockCan.mockReturnValue(false);

    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    expect(res.status).toBe(403);
  });

  it('404 — invoice not found', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('999'));

    expect(res.status).toBe(404);
    const data = (res as unknown as { _data: { success: boolean } })._data;
    expect(data.success).toBe(false);
  });

  it('400 — cancelled invoice cannot be sent', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({ ...mockInvoice, status: 'CANCELLED' });

    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    expect(res.status).toBe(400);
  });

  it('400 — client has no email', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      cliente: { ...mockInvoice.cliente, email: null },
    });

    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    expect(res.status).toBe(400);
  });

  it('single-tenant: findFirst used for invoice lookup on send', async () => {
    (mockPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    expect(res.status).toBe(404);
    expect(mockPrisma.invoice.findFirst).toHaveBeenCalled();
  });

  it('response format includes success:true and data envelope', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/send/route');
    const res = await POST(makeRequest(), makeContext('1'));

    const data = (res as unknown as { _data: { success?: boolean; data?: object } })._data;
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });
});
