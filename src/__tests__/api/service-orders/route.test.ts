/**
 * Unit Tests — GET /api/service-orders & POST /api/service-orders
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
      json: jest.fn().mockImplementation(() => {
        if (init?.body) { try { return Promise.resolve(JSON.parse(init.body)); } catch { return Promise.resolve({}); } }
        return Promise.resolve({});
      }),
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
    serviceOrder: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
    },
    auditLog: { create: jest.fn() },
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
  id: 1,
  email: 'admin@gladpros.com',
  role: 'ADMIN',
  empresaId: 1,
  nivel: 1,
};

const mockServiceOrder = {
  id: 1,
  ticketNumber: 'OS-2024-0001',
  title: 'Instalação elétrica',
  description: 'Instalação de tomadas',
  status: 'SCHEDULED',
  priority: 'MEDIUM',
  clienteId: 1,
  assignedWorkerId: null,
  scheduledDate: new Date('2024-03-15'),
  scheduleDateStart: null,
  scheduleDateEnd: null,
  scheduleType: 'FIXED',
  total: null,
  createdAt: new Date('2024-03-01'),
  updatedAt: new Date('2024-03-01'),
  Cliente: { id: 1, nomeCompleto: 'John Doe', nomeFantasia: null },
  AssignedWorker: null,
  materials: [],
  createdBy: { id: 1, nomeCompleto: 'Admin User' },
};

const mockCliente = {
  id: 1,
  nomeCompleto: 'John Doe',
  nomeFantasia: null,
  addressStreet: '123 Main St',
  addressUnit: null,
  addressCity: 'Dallas',
  addressState: 'TX',
  addressZip: '75201',
  telefone: '214-555-0100',
};

function makeRequest(url = 'http://localhost/api/service-orders', init?: { method?: string; body?: string }) {
  return new NextRequest(url, init);
}

describe('GET /api/service-orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.serviceOrder.findMany as jest.Mock).mockResolvedValue([mockServiceOrder]);
    (mockPrisma.serviceOrder.count as jest.Mock).mockResolvedValue(1);
  });

  it('200 — returns paginated service orders list', async () => {
    const { GET } = await import('@/app/api/service-orders/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { data: unknown[]; success: boolean; pagination: object } })._data;
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeDefined();
  });

  it('401 — rejects unauthenticated request', async () => {
    mockRequireUser.mockRejectedValue(Object.assign(new Error('UNAUTHENTICATED'), {}));
    const { GET } = await import('@/app/api/service-orders/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('403 — rejects user without service-orders read permission', async () => {
    mockCan.mockReturnValue(false);
    const { GET } = await import('@/app/api/service-orders/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('200 — filters by status=COMPLETED', async () => {
    (mockPrisma.serviceOrder.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceOrder.count as jest.Mock).mockResolvedValue(0);
    const { GET } = await import('@/app/api/service-orders/route');
    const res = await GET(makeRequest('http://localhost/api/service-orders?status=COMPLETED'));
    expect(res.status).toBe(200);
  });

  it('200 — filters by clienteId', async () => {
    const { GET } = await import('@/app/api/service-orders/route');
    const res = await GET(makeRequest('http://localhost/api/service-orders?clienteId=1'));
    expect(res.status).toBe(200);
    expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalled();
  });

  it('200 — supports search query param', async () => {
    const { GET } = await import('@/app/api/service-orders/route');
    const res = await GET(makeRequest('http://localhost/api/service-orders?search=elétrica'));
    expect(res.status).toBe(200);
  });

  it('returns correct pagination metadata', async () => {
    (mockPrisma.serviceOrder.count as jest.Mock).mockResolvedValue(55);
    (mockPrisma.serviceOrder.findMany as jest.Mock).mockResolvedValue(
      Array(20).fill(mockServiceOrder)
    );
    const { GET } = await import('@/app/api/service-orders/route');
    const res = await GET(makeRequest('http://localhost/api/service-orders?page=2&limit=20'));
    expect(res.status).toBe(200);
    const data = (res as unknown as { _data: { pagination: { total: number; page: number } } })._data;
    expect(data.pagination).toBeDefined();
    expect(data.pagination.total).toBe(55);
  });
});

describe('POST /api/service-orders', () => {
  const validBody = {
    clienteId: 1,
    title: 'Reparo elétrico',
    description: 'Trocar tomadas da sala',
    scheduleType: 'FIXED',
    scheduledDate: '2024-04-01',
    materialSupply: 'COMPANY_PROVIDES',
    sameClientAddress: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue(mockUser as never);
    mockCan.mockReturnValue(true);
    (mockPrisma.cliente.findUnique as jest.Mock).mockResolvedValue(mockCliente);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
      const tx = {
        serviceOrder: {
          findFirst: jest.fn().mockResolvedValue(null), // no existing OS this year
          create: jest.fn().mockResolvedValue({ ...mockServiceOrder, id: 2, ticketNumber: 'OS-2024-0002' }),
        },
      };
      return cb(tx);
    });
  });

  it('201 — creates service order with auto-generated ticket number', async () => {
    const { POST } = await import('@/app/api/service-orders/route');
    const res = await POST(makeRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(201);
    const data = (res as unknown as { _data: { data: { ticketNumber: string }; success: boolean } })._data;
    expect(data.success).toBe(true);
    expect(data.data.ticketNumber).toMatch(/^OS-\d{4}-\d{4}$/);
  });

  it('401 — rejects unauthenticated create', async () => {
    mockRequireUser.mockRejectedValue(Object.assign(new Error('UNAUTHENTICATED'), {}));
    const { POST } = await import('@/app/api/service-orders/route');
    const res = await POST(makeRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(401);
  });

  it('403 — rejects user without service-orders create permission', async () => {
    mockCan.mockImplementation((_role: unknown, _module: unknown, action: unknown) => action !== 'create');
    const { POST } = await import('@/app/api/service-orders/route');
    const res = await POST(makeRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(403);
  });

  it('400 — rejects missing required fields', async () => {
    const { POST } = await import('@/app/api/service-orders/route');
    const res = await POST(makeRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: JSON.stringify({ description: 'No title, no clienteId' }),
    }));
    expect(res.status).toBe(400);
  });

  it('copies client address when sameClientAddress=true', async () => {
    const { POST } = await import('@/app/api/service-orders/route');
    await POST(makeRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, sameClientAddress: true }),
    }));
    expect(mockPrisma.cliente.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
  });

  it('does NOT query client address when sameClientAddress=false', async () => {
    const { POST } = await import('@/app/api/service-orders/route');
    await POST(makeRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: JSON.stringify({
        ...validBody,
        sameClientAddress: false,
        serviceAddressLine1: '456 Oak Ave',
        serviceCity: 'Plano',
        serviceState: 'TX',
        serviceZip: '75023',
      }),
    }));
    expect(mockPrisma.cliente.findUnique).not.toHaveBeenCalled();
  });

  it('increments ticket number from last OS of the year', async () => {
    const currentYear = new Date().getFullYear();
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
      const tx = {
        serviceOrder: {
          findFirst: jest.fn().mockResolvedValue({ ticketNumber: `OS-${currentYear}-0005` }),
          create: jest.fn().mockResolvedValue({ ...mockServiceOrder, ticketNumber: `OS-${currentYear}-0006` }),
        },
      };
      return cb(tx);
    });
    const { POST } = await import('@/app/api/service-orders/route');
    await POST(makeRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }));
    const txCb = (mockPrisma.$transaction as jest.Mock).mock.calls[0]?.[0];
    const tx = {
      serviceOrder: {
        findFirst: jest.fn().mockResolvedValue({ ticketNumber: `OS-${currentYear}-0005` }),
        create: jest.fn().mockResolvedValue({ ticketNumber: `OS-${currentYear}-0006` }),
      },
    };
    await txCb(tx);
    const createCall = tx.serviceOrder.create.mock.calls[0]?.[0];
    expect(createCall?.data?.ticketNumber).toBe(`OS-${currentYear}-0006`);
  });
});
